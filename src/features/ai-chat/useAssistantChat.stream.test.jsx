import { renderHook, act, waitFor, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiService from '../../services/apiService';
import { useChatState } from './useAssistantChat';
import ChatBubble from './components/ChatBubble';

vi.mock('../../services/apiService', () => ({ default: { post: vi.fn(), chatStream: vi.fn() } }));

const FINAL = { response: 'El paquete está en La Paz.', attachments: [{ kind: 'package_tracking', package: { tracking_code: 'TRK-1', status: 'asignado' } }] };
const last = (r) => r.current.messages[r.current.messages.length - 1];

describe('El chat muestra la respuesta a medida que se escribe', () => {
  beforeEach(() => { apiService.post.mockReset(); apiService.chatStream.mockReset(); });

  it('el primer trozo crea el mensaje "en vivo" y al terminar se completa con el texto final y las tarjetas', async () => {
    let release;
    apiService.chatStream.mockImplementation(async (_body, h) => {
      h.onStatus('get_package_tracking');
      h.onToken('El paquete');
      await new Promise((r) => { release = r; });
      h.onToken(' está en La Paz.');
      return FINAL;
    });
    const { result } = renderHook(() => useChatState());
    let promise;
    act(() => { promise = result.current.send('¿Dónde está TRK-1?'); });

    await waitFor(() => expect(last(result)).toMatchObject({ role: 'assistant', streaming: true, content: 'El paquete' }));
    expect(result.current.status).toBe('Buscando tu paquete…'); // qué está consultando
    expect(result.current.loading).toBe(true);

    release();
    const out = await act(async () => promise);
    expect(out).toMatchObject({ ok: true, text: FINAL.response });
    expect(last(result)).toMatchObject({ streaming: false, content: FINAL.response, attachments: FINAL.attachments });
    expect(result.current.messages.filter((m) => m.role === 'assistant')).toHaveLength(1); // no se duplica
    expect(result.current.loading).toBe(false);
    expect(result.current.status).toBe('');
  });

  it('agrupa los trozos: el mensaje no se redibuja en cada token', async () => {
    apiService.chatStream.mockImplementation(async (_b, h) => {
      for (const t of ['a', 'b', 'c', 'd', 'e']) h.onToken(t);
      await new Promise((r) => setTimeout(r, 120));
      return { response: 'abcde', attachments: [] };
    });
    const { result } = renderHook(() => useChatState());
    await act(async () => { await result.current.send('hola'); });
    expect(last(result).content).toBe('abcde');
  });

  it('un "reset" del servidor descarta lo mostrado', async () => {
    apiService.chatStream.mockImplementation(async (_b, h) => {
      h.onToken('pensando en voz alta');
      h.onReset();
      return { response: 'Respuesta final', attachments: [] };
    });
    const { result } = renderHook(() => useChatState());
    await act(async () => { await result.current.send('hola'); });
    const assistants = result.current.messages.filter((m) => m.role === 'assistant');
    expect(assistants).toHaveLength(1);
    expect(assistants[0].content).toBe('Respuesta final');
  });

  it('el mensaje a medias nunca se envía como contexto de la siguiente pregunta', async () => {
    let release;
    apiService.chatStream.mockImplementationOnce(async (_b, h) => { h.onToken('parcial'); await new Promise((r) => { release = r; }); return { response: 'completo', attachments: [] }; });
    const { result } = renderHook(() => useChatState());
    let p;
    act(() => { p = result.current.send('primera'); });
    await waitFor(() => expect(last(result).streaming).toBe(true));
    release(); await act(async () => p);

    apiService.chatStream.mockResolvedValueOnce({ response: 'otra', attachments: [] });
    await act(async () => { await result.current.send('segunda'); });
    const history = apiService.chatStream.mock.calls[1][0].history;
    expect(history).toEqual([{ role: 'user', content: 'primera' }, { role: 'assistant', content: 'completo' }]);
  });

  it('si no hay respuesta en vivo y no se mostró nada, usa la petición normal', async () => {
    apiService.chatStream.mockRejectedValue(Object.assign(new Error('x'), { code: 'NO_STREAM' }));
    apiService.post.mockResolvedValue({ response: 'por la vía normal', attachments: [] });
    const { result } = renderHook(() => useChatState());
    const out = await act(async () => result.current.send('hola'));
    expect(apiService.post).toHaveBeenCalledWith('/ai-agent/chat', { message: 'hola', history: [] });
    expect(out.text).toBe('por la vía normal');
  });

  it('un error de red (sin código HTTP) también cae a la petición normal', async () => {
    apiService.chatStream.mockRejectedValue(new TypeError('Failed to fetch'));
    apiService.post.mockResolvedValue({ response: 'ok', attachments: [] });
    const { result } = renderHook(() => useChatState());
    await act(async () => { await result.current.send('hola'); });
    expect(apiService.post).toHaveBeenCalled();
  });

  it('un 429 no se reintenta: se explica que hay muchas consultas', async () => {
    apiService.chatStream.mockRejectedValue(Object.assign(new Error('x'), { status: 429 }));
    const { result } = renderHook(() => useChatState());
    const out = await act(async () => result.current.send('hola'));
    expect(apiService.post).not.toHaveBeenCalled();
    expect(out.isError).toBe(true);
    expect(last(result).content).toMatch(/muchas consultas/i);
  });

  it('si falla después de mostrar texto, el texto a medias se retira y se muestra el error', async () => {
    apiService.chatStream.mockImplementation(async (_b, h) => { h.onToken('a medias'); throw Object.assign(new Error('x'), { status: 500 }); });
    const { result } = renderHook(() => useChatState());
    await act(async () => { await result.current.send('hola'); });
    const assistants = result.current.messages.filter((m) => m.role === 'assistant');
    expect(assistants).toHaveLength(1);
    expect(assistants[0]).toMatchObject({ isError: true });
    expect(assistants[0].content).not.toMatch(/a medias/);
  });
});

describe('Burbuja del asistente mientras escribe', () => {
  it('muestra el texto plano con un cursor, sin tarjetas ni sugerencias hasta terminar', () => {
    render(
      <MemoryRouter>
        <ChatBubble
          message={{ role: 'assistant', content: 'El **paquete', streaming: true, attachments: [{ kind: 'package_tracking', package: { tracking_code: 'TRK-1', status: 'asignado' } }] }}
          showFollowUps
        />
      </MemoryRouter>,
    );
    expect(screen.getByText(/El paquete/)).toBeInTheDocument(); // sin los ** a medias
    expect(screen.queryByText('TRK-1')).not.toBeInTheDocument(); // la tarjeta espera al final
  });
});
