import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import streamChat from './streamChat';
import api from './api';

vi.mock('./api', () => ({
  API_BASE_URL: 'http://api.test/api',
  default: { post: vi.fn() },
}));

const enc = new TextEncoder();
const sse = (...events) => events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join('');

/** Respuesta de fetch cuyo cuerpo llega en los trozos indicados (un trozo puede cortar un evento por la mitad). */
const streamResponse = (chunks, init = {}) =>
  new Response(new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(enc.encode(c));
      controller.close();
    },
  }), { status: 200, headers: { 'Content-Type': 'text/event-stream' }, ...init });

describe('streamChat (respuesta del asistente en vivo)', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); api.post.mockReset(); });
  afterEach(() => vi.unstubAllGlobals());

  it('envía la sesión por cookies y la cabecera anti-CSRF, y entrega los eventos en orden', async () => {
    fetch.mockResolvedValue(streamResponse([sse({ type: 'status', tool: 'get_package_tracking' }, { type: 'token', text: 'Hola' }, { type: 'token', text: ' mundo' }, { type: 'final', response: 'Hola mundo', attachments: [{ kind: 'package_tracking' }], model: 'x:y' })]));
    const seen = [];
    const final = await streamChat({ message: 'hola', history: [] }, { onStatus: (t) => seen.push(`status:${t}`), onToken: (t) => seen.push(`token:${t}`) });

    expect(seen).toEqual(['status:get_package_tracking', 'token:Hola', 'token: mundo']);
    expect(final).toMatchObject({ response: 'Hola mundo', attachments: [{ kind: 'package_tracking' }], model: 'x:y' });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('http://api.test/api/ai-agent/chat/stream');
    expect(init.credentials).toBe('include');
    expect(init.headers['X-Requested-With']).toBe('XMLHttpRequest');
    expect(JSON.parse(init.body)).toEqual({ message: 'hola', history: [] });
  });

  it('reconstruye eventos que llegan cortados por la mitad entre trozos de red', async () => {
    const all = sse({ type: 'token', text: 'ñandú' }, { type: 'final', response: 'ñandú', attachments: [] });
    const cut = Math.floor(all.length / 3);
    fetch.mockResolvedValue(streamResponse([all.slice(0, cut), all.slice(cut, cut * 2), all.slice(cut * 2)]));
    const tokens = [];
    const final = await streamChat({ message: 'x' }, { onToken: (t) => tokens.push(t) });
    expect(tokens).toEqual(['ñandú']);
    expect(final.response).toBe('ñandú');
  });

  it('ignora los latidos (": ping") que mantienen viva la conexión', async () => {
    fetch.mockResolvedValue(streamResponse([': ping\n\n', sse({ type: 'final', response: 'ok', attachments: [] })]));
    await expect(streamChat({ message: 'x' })).resolves.toMatchObject({ response: 'ok' });
  });

  it('avisa cuando el servidor pide descartar lo mostrado (reset)', async () => {
    fetch.mockResolvedValue(streamResponse([sse({ type: 'token', text: 'pensando…' }, { type: 'reset' }, { type: 'token', text: 'respuesta' }, { type: 'final', response: 'respuesta', attachments: [] })]));
    const log = [];
    await streamChat({ message: 'x' }, { onToken: (t) => log.push(t), onReset: () => log.push('RESET') });
    expect(log).toEqual(['pensando…', 'RESET', 'respuesta']);
  });

  it('un evento de error se convierte en una excepción con su código HTTP', async () => {
    fetch.mockResolvedValue(streamResponse([sse({ type: 'error', status: 429, message: 'Muchas consultas' })]));
    await expect(streamChat({ message: 'x' })).rejects.toMatchObject({ status: 429, message: 'Muchas consultas' });
  });

  it('si la respuesta HTTP no es correcta, propaga el estado y el mensaje del servidor', async () => {
    fetch.mockResolvedValue(new Response(JSON.stringify({ message: 'Demasiados mensajes al asistente.' }), { status: 429 }));
    await expect(streamChat({ message: 'x' })).rejects.toMatchObject({ status: 429, message: 'Demasiados mensajes al asistente.' });
  });

  it('con la sesión vencida (401) la renueva una vez y repite la petición', async () => {
    fetch
      .mockResolvedValueOnce(new Response('{}', { status: 401 }))
      .mockResolvedValueOnce(streamResponse([sse({ type: 'final', response: 'ya con sesión', attachments: [] })]));
    api.post.mockResolvedValue({});
    const final = await streamChat({ message: 'x' });
    expect(api.post).toHaveBeenCalledWith('/iam/refresh');
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(final.response).toBe('ya con sesión');
  });

  it('si el flujo se corta antes del final, lo señala para poder usar la petición normal', async () => {
    fetch.mockResolvedValue(streamResponse([sse({ type: 'token', text: 'a medias' })]));
    await expect(streamChat({ message: 'x' })).rejects.toMatchObject({ code: 'STREAM_CUT' });
  });

  it('si el navegador no puede leer el flujo, lo señala', async () => {
    fetch.mockResolvedValue({ ok: true, status: 200, body: null });
    await expect(streamChat({ message: 'x' })).rejects.toMatchObject({ code: 'NO_STREAM' });
  });
});
