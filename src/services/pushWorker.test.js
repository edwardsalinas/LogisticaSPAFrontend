import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

/**
 * El service worker REAL (public/sw.js y public/push-handlers.js) cargado en un entorno simulado: se prueba lo que de verdad se publica,
 * no una copia. Cubre el reparto de avisos con la pestaña cerrada y que su fallo nunca afecte a la cola de puntos GPS.
 */
const read = (name) => readFileSync(resolve(process.cwd(), 'public', name), 'utf8');

const makeSelf = ({ importFails = false, windows = [] } = {}) => {
  const listeners = {};
  const shown = [];
  const opened = [];
  const self = {
    listeners, shown, opened,
    location: { origin: 'https://logistica.example' },
    addEventListener: (type, fn) => { listeners[type] = fn; },
    skipWaiting: () => {},
    clients: { claim: () => {}, matchAll: async () => windows, openWindow: async (url) => { opened.push(url); } },
    registration: { showNotification: async (title, opts) => { shown.push({ title, opts }); } },
    indexedDB: {},
  };
  self.self = self;
  self.importScripts = (url) => {
    if (importFails) throw new Error('404');
    vm.runInContext(read(url.replace(/^\//, '')), ctx);
  };
  const ctx = vm.createContext({ ...self, URL, JSON, Promise, Object, console, Array });
  ctx.self = ctx; ctx.importScripts = self.importScripts;
  Object.assign(ctx, { listeners, shown, opened });
  vm.runInContext(read('sw.js'), ctx);
  return ctx;
};

const waitUntilOf = (fn, event) => { let p; fn({ ...event, waitUntil: (x) => { p = x; } }); return p; };
const pushEvent = (obj) => ({ data: { text: () => (typeof obj === 'string' ? obj : JSON.stringify(obj)) } });

describe('push-handlers.js', () => {
  const ctx = makeSelf();
  const { parsePayload, safeUrl, shouldShow } = ctx.LogiPush;

  it('lee un mensaje válido y recorta lo demasiado largo', () => {
    expect(parsePayload(JSON.stringify({ title: 'Logi', body: 'Hay paquetes con siniestro', url: '/tracking', tag: 'a1' }))).toEqual({ title: 'Logi', body: 'Hay paquetes con siniestro', url: '/tracking', tag: 'a1' });
    const long = parsePayload(JSON.stringify({ title: 't'.repeat(500), body: 'b'.repeat(500), tag: 'x'.repeat(500) }));
    expect([long.title.length, long.body.length, long.tag.length]).toEqual([60, 160, 80]);
  });

  it('un mensaje roto, vacío o de otro tipo NO rompe nada: sale un aviso genérico', () => {
    for (const bad of ['', 'no es json', '[]', 'null', '42', '"texto"', '{"title": 5, "body": {}}']) {
      const p = parsePayload(bad);
      expect(p.title).toBeTruthy();
      expect(p.body).toBeTruthy();
      expect(p.url).toBe('/');
    }
  });

  it('solo abre rutas de la propia aplicación', () => {
    for (const url of ['https://sitio-ajeno.example/', '//sitio-ajeno.example', 'javascript:alert(1)', 'data:text/html,x', '/a b', '/x\ny', 5, null, undefined, '/' + 'a'.repeat(400)]) {
      expect(safeUrl(url), String(url).slice(0, 30)).toBe('/');
    }
    expect(safeUrl('/logistics/packages/abc?x=1')).toBe('/logistics/packages/abc?x=1');
  });

  it('no muestra la notificación si ya hay una pestaña a la vista', () => {
    expect(shouldShow([])).toBe(true);
    expect(shouldShow([{ visibilityState: 'hidden' }])).toBe(true);
    expect(shouldShow([{ visibilityState: 'hidden' }, { visibilityState: 'visible' }])).toBe(false);
    expect(shouldShow(undefined)).toBe(true);
  });
});

describe('sw.js: evento push', () => {
  it('con la pestaña cerrada muestra la notificación con el título del aviso y la dirección a abrir', async () => {
    const sw = makeSelf({ windows: [] });
    await waitUntilOf(sw.listeners.push, pushEvent({ title: 'Logi', body: 'Hay paquetes con siniestro', url: '/tracking', tag: 'a1' }));
    expect(sw.shown).toHaveLength(1);
    expect(sw.shown[0].title).toBe('Logi');
    expect(sw.shown[0].opts).toMatchObject({ body: 'Hay paquetes con siniestro', tag: 'a1', data: { url: '/tracking' } });
  });

  it('con una pestaña a la vista NO muestra nada (la aplicación ya avisa)', async () => {
    const sw = makeSelf({ windows: [{ visibilityState: 'visible', url: 'https://logistica.example/' }] });
    await waitUntilOf(sw.listeners.push, pushEvent({ title: 'Logi', body: 'x', url: '/' }));
    expect(sw.shown).toHaveLength(0);
  });

  it('un mensaje basura igual muestra un aviso genérico, nunca lanza', async () => {
    const sw = makeSelf({ windows: [] });
    await waitUntilOf(sw.listeners.push, pushEvent('<<no es json>>'));
    await waitUntilOf(sw.listeners.push, { data: null });
    expect(sw.shown).toHaveLength(2);
    expect(sw.shown[1].opts.data.url).toBe('/');
  });

  it('una dirección de otro sitio dentro del mensaje se descarta al mostrarla', async () => {
    const sw = makeSelf({ windows: [] });
    await waitUntilOf(sw.listeners.push, pushEvent({ title: 'Logi', body: 'x', url: 'https://sitio-ajeno.example/robar' }));
    expect(sw.shown[0].opts.data.url).toBe('/');
  });
});

describe('sw.js: tocar la notificación', () => {
  const click = (sw, url) => {
    const closed = vi.fn();
    return { closed, p: waitUntilOf(sw.listeners.notificationclick, { notification: { close: closed, data: { url } } }) };
  };

  it('sin pestañas abiertas abre una ventana en la dirección del aviso', async () => {
    const sw = makeSelf({ windows: [] });
    const { closed, p } = click(sw, '/tracking');
    await p;
    expect(closed).toHaveBeenCalled();
    expect(sw.opened).toEqual(['/tracking']);
  });

  it('con una pestaña de la aplicación abierta la enfoca y la lleva allí, sin abrir otra', async () => {
    const focus = vi.fn(async () => {});
    const navigate = vi.fn(async () => {});
    const sw = makeSelf({ windows: [{ url: 'https://logistica.example/dashboard', focus, navigate }] });
    await click(sw, '/tracking').p;
    expect(focus).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/tracking');
    expect(sw.opened).toEqual([]);
  });

  it('una pestaña de OTRO sitio no se usa; y una dirección ajena nunca se abre', async () => {
    const foreign = { url: 'https://sitio-ajeno.example/', focus: vi.fn(), navigate: vi.fn() };
    const sw = makeSelf({ windows: [foreign] });
    await click(sw, 'https://sitio-ajeno.example/robar').p;
    expect(foreign.focus).not.toHaveBeenCalled();
    expect(sw.opened).toEqual(['/']);
  });
});

describe('sw.js: el aviso nunca pone en peligro la cola de puntos GPS', () => {
  it('si push-handlers.js no se puede cargar, el service worker se instala igual y conserva su cola GPS', () => {
    const sw = makeSelf({ importFails: true });
    expect(sw.listeners.sync).toBeTypeOf('function'); // la cola GPS sigue registrada
    expect(sw.listeners.install).toBeTypeOf('function');
    expect(sw.LogiPush).toBeUndefined();
  });

  it('sin push-handlers los eventos push y de toque simplemente no hacen nada (no lanzan)', () => {
    const sw = makeSelf({ importFails: true });
    expect(() => sw.listeners.push({ data: null, waitUntil() {} })).not.toThrow();
    expect(() => sw.listeners.notificationclick({ notification: { close() {}, data: {} }, waitUntil() {} })).not.toThrow();
    expect(sw.shown).toHaveLength(0);
  });

  it('con todo cargado siguen estando los eventos de siempre (install, activate, sync)', () => {
    const sw = makeSelf();
    for (const type of ['install', 'activate', 'sync', 'push', 'notificationclick']) expect(sw.listeners[type], type).toBeTypeOf('function');
  });
});
