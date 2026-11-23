import api, { API_BASE_URL } from './api';

/**
 * Chat con el asistente con la respuesta en vivo (Server-Sent Events sobre POST).
 *
 * La sesión va en cookies httpOnly, así que no sirve EventSource (solo GET y sin cabeceras propias): se lee la
 * respuesta con fetch. Eventos del servidor: status, token, reset, final y error.
 *
 * @param {object} body { message, history, voice }
 * @param {{ onStatus?: (tool: string) => void, onToken?: (text: string) => void, onReset?: () => void, signal?: AbortSignal }} handlers
 * @returns {Promise<{ response: string, attachments: object[], model?: string }>} el evento `final`
 */
export default async function streamChat(body, { onStatus, onToken, onReset, signal } = {}) {
  const url = `${API_BASE_URL}/ai-agent/chat/stream`;
  const request = () => fetch(url, {
    method: 'POST',
    credentials: 'include',
    signal,
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', Accept: 'text/event-stream' },
    body: JSON.stringify(body),
  });

  let res = await request();
  if (res.status === 401) {
    // sesión vencida: se renueva una vez y se repite (igual que hace el cliente axios)
    await api.post('/iam/refresh');
    res = await request();
  }
  if (!res.ok) {
    let message = 'No se pudo procesar la consulta.';
    try { message = (await res.json())?.message || message; } catch { /* sin cuerpo JSON */ }
    throw Object.assign(new Error(message), { status: res.status });
  }
  if (!res.body?.getReader) throw Object.assign(new Error('El navegador no permite leer la respuesta en vivo'), { code: 'NO_STREAM' });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let final = null;

  const handle = (event) => {
    if (event.type === 'token') onToken?.(event.text);
    else if (event.type === 'status') onStatus?.(event.tool);
    else if (event.type === 'reset') onReset?.();
    else if (event.type === 'final') final = event;
    else if (event.type === 'error') throw Object.assign(new Error(event.message || 'Error del asistente'), { status: event.status ?? 500 });
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let end;
    while ((end = buffer.indexOf('\n\n')) > -1) {
      const raw = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      if (!raw.startsWith('data:')) continue; // comentarios (": ping") y líneas vacías
      handle(JSON.parse(raw.slice(5).trim()));
    }
  }
  if (!final) throw Object.assign(new Error('La respuesta se cortó antes de terminar'), { code: 'STREAM_CUT' });
  return final;
}
