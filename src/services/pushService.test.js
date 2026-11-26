import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ getPushConfig: vi.fn(), subscribePush: vi.fn(), unsubscribePush: vi.fn() }));
vi.mock('./apiService', () => ({ default: api }));

import { disablePush, enablePush, pushStatus, pushSupported, urlBase64ToUint8Array } from './pushService';

const KEY = 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM';
const SUB_JSON = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys: { p256dh: 'p'.repeat(20), auth: 'a'.repeat(16) } };

/** Un navegador simulado con service worker, PushManager y Notification. */
const installBrowser = ({ permission = 'default', subscribed = false, requestResult = 'granted', subscribeFails = false } = {}) => {
  let current = subscribed ? { endpoint: SUB_JSON.endpoint, toJSON: () => SUB_JSON, unsubscribe: vi.fn(async () => { current = null; return true; }) } : null;
  const pushManager = {
    getSubscription: vi.fn(async () => current),
    subscribe: vi.fn(async () => {
      if (subscribeFails) throw new Error('push service no disponible');
      current = { endpoint: SUB_JSON.endpoint, toJSON: () => SUB_JSON, unsubscribe: vi.fn(async () => { current = null; return true; }) };
      return current;
    }),
  };
  const reg = { pushManager };
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { getRegistration: vi.fn(async () => reg), ready: Promise.resolve(reg) } });
  window.PushManager = function PushManager() {};
  window.Notification = { permission, requestPermission: vi.fn(async () => { window.Notification.permission = requestResult; return requestResult; }) };
  return { pushManager };
};

const removeBrowser = () => {
  delete window.PushManager;
  delete window.Notification;
  delete navigator.serviceWorker;
};

beforeEach(() => { api.getPushConfig.mockResolvedValue({ data: { data: { enabled: true, publicKey: KEY } } }); api.subscribePush.mockResolvedValue({}); api.unsubscribePush.mockResolvedValue({}); });
afterEach(() => { vi.clearAllMocks(); removeBrowser(); });

describe('urlBase64ToUint8Array', () => {
  it('convierte la clave pública de base64 de URL a los 65 bytes que pide el navegador', () => {
    const bytes = urlBase64ToUint8Array(KEY);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(65);
    expect(bytes[0]).toBe(0x04); // punto sin comprimir
  });
});

describe('pushStatus', () => {
  it('un navegador sin soporte (o sin PushManager) → unsupported, sin tocar el servidor', async () => {
    removeBrowser();
    expect(pushSupported()).toBe(false);
    expect(await pushStatus()).toBe('unsupported');
    expect(api.getPushConfig).not.toHaveBeenCalled();
  });

  it('si el servidor no los ofrece (o no responde) → unavailable', async () => {
    installBrowser();
    api.getPushConfig.mockResolvedValue({ data: { data: { enabled: false, reason: 'sin_tabla' } } });
    expect(await pushStatus()).toBe('unavailable');
    api.getPushConfig.mockRejectedValue(new Error('red'));
    expect(await pushStatus()).toBe('unavailable');
  });

  it('permiso bloqueado → denied; sin suscripción → off; suscrito y permitido → on', async () => {
    installBrowser({ permission: 'denied' });
    expect(await pushStatus()).toBe('denied');
    removeBrowser(); installBrowser({ permission: 'granted' });
    expect(await pushStatus()).toBe('off');
    removeBrowser(); installBrowser({ permission: 'granted', subscribed: true });
    expect(await pushStatus()).toBe('on');
  });

  it('una suscripción que quedó pero con el permiso retirado NO cuenta como encendido', async () => {
    installBrowser({ permission: 'default', subscribed: true });
    expect(await pushStatus()).toBe('off');
  });
});

describe('enablePush', () => {
  it('pide el permiso, se suscribe con la clave del servidor y envía la suscripción', async () => {
    const { pushManager } = installBrowser();
    expect(await enablePush()).toBe('on');
    expect(window.Notification.requestPermission).toHaveBeenCalledTimes(1);
    const arg = pushManager.subscribe.mock.calls[0][0];
    expect(arg.userVisibleOnly).toBe(true);
    expect(arg.applicationServerKey).toBeInstanceOf(Uint8Array);
    expect(api.subscribePush).toHaveBeenCalledWith(SUB_JSON);
  });

  it('el permiso se pide SOLO al activar: consultar el estado nunca lo pide', async () => {
    installBrowser();
    await pushStatus();
    expect(window.Notification.requestPermission).not.toHaveBeenCalled();
  });

  it('si la persona rechaza el permiso, no se suscribe ni se envía nada', async () => {
    const { pushManager } = installBrowser({ requestResult: 'denied' });
    expect(await enablePush()).toBe('denied');
    expect(pushManager.subscribe).not.toHaveBeenCalled();
    expect(api.subscribePush).not.toHaveBeenCalled();
  });

  it('si cierra el cuadro sin decidir (default), queda apagado y no es un error', async () => {
    installBrowser({ requestResult: 'default' });
    expect(await enablePush()).toBe('off');
  });

  it('sin soporte o con el servidor sin la función, no pide permiso', async () => {
    removeBrowser();
    expect(await enablePush()).toBe('unsupported');
    installBrowser();
    api.getPushConfig.mockResolvedValue({ data: { data: { enabled: false } } });
    expect(await enablePush()).toBe('unavailable');
    expect(window.Notification.requestPermission).not.toHaveBeenCalled();
  });

  it('si el navegador no puede suscribirse, o el servidor rechaza, devuelve off y no lanza', async () => {
    installBrowser({ subscribeFails: true });
    await expect(enablePush()).resolves.toBe('off');
    removeBrowser(); installBrowser();
    api.subscribePush.mockRejectedValue(new Error('503'));
    await expect(enablePush()).resolves.toBe('off');
  });

  it('si ya había una suscripción en el navegador la reutiliza (no crea otra)', async () => {
    const { pushManager } = installBrowser({ subscribed: true });
    expect(await enablePush()).toBe('on');
    expect(pushManager.subscribe).not.toHaveBeenCalled();
    expect(api.subscribePush).toHaveBeenCalled();
  });
});

describe('disablePush', () => {
  it('cancela la suscripción del navegador y avisa al servidor con su dirección', async () => {
    installBrowser({ permission: 'granted', subscribed: true });
    expect(await disablePush()).toBe('off');
    expect(api.unsubscribePush).toHaveBeenCalledWith({ endpoint: SUB_JSON.endpoint });
  });

  it('si el servidor no responde igual queda apagado en el navegador', async () => {
    installBrowser({ permission: 'granted', subscribed: true });
    api.unsubscribePush.mockRejectedValue(new Error('red'));
    await expect(disablePush()).resolves.toBe('off');
  });

  it('sin suscripción no hace nada; sin soporte lo dice', async () => {
    installBrowser({ permission: 'granted' });
    expect(await disablePush()).toBe('off');
    expect(api.unsubscribePush).not.toHaveBeenCalled();
    removeBrowser();
    expect(await disablePush()).toBe('unsupported');
  });
});
