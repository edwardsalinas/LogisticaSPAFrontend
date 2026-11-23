import { render, screen, within, waitFor, renderHook, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiService from '../../services/apiService';
import ConversationHistory, { refreshConversationList } from './components/ConversationHistory';
import AiUsagePage from './pages/AiUsagePage';
import { useChatState } from './useAssistantChat';
import { relativeTime } from './time';

vi.mock('../../services/apiService', () => ({
  default: {
    post: vi.fn(), chatStream: vi.fn(),
    getAiConversations: vi.fn(), getAiConversation: vi.fn(), deleteAiConversation: vi.fn(), getAiUsage: vi.fn(),
  },
}));

const ago = (ms) => new Date(Date.now() - ms).toISOString();
const LIST = [
  { id: 'c1', title: '¿Dónde está TRK-1?', updated_at: ago(5 * 60 * 1000) },
  { id: 'c2', title: 'Resumen del día', updated_at: ago(3 * 3600 * 1000) },
];

beforeEach(() => Object.values(apiService).forEach((f) => f.mockReset()));

describe('relativeTime', () => {
  it('dice cuánto pasó en español', () => {
    expect(relativeTime(ago(10 * 1000))).toBe('justo ahora');
    expect(relativeTime(ago(5 * 60 * 1000))).toMatch(/hace 5 min/);
    expect(relativeTime(ago(3 * 3600 * 1000))).toMatch(/hace 3 horas/);
    expect(relativeTime(ago(26 * 3600 * 1000))).toMatch(/ayer/);
    expect(relativeTime('basura')).toBe('');
  });
});

describe('Historial de conversaciones', () => {
  it('lista las conversaciones con su título y cuánto hace', async () => {
    apiService.getAiConversations.mockResolvedValue({ data: LIST });
    render(<ConversationHistory onOpen={vi.fn()} />);
    expect(await screen.findByText('¿Dónde está TRK-1?')).toBeInTheDocument();
    expect(screen.getByText('Resumen del día')).toBeInTheDocument();
    expect(screen.getByText(/hace 5 min/)).toBeInTheDocument();
  });

  it('al elegir una conversación se abre (con su id)', async () => {
    apiService.getAiConversations.mockResolvedValue({ data: LIST });
    const onOpen = vi.fn();
    render(<ConversationHistory onOpen={onOpen} />);
    await userEvent.click(await screen.findByRole('button', { name: /^resumen del día/i }));
    expect(onOpen).toHaveBeenCalledWith('c2');
  });

  it('marca la conversación activa', async () => {
    apiService.getAiConversations.mockResolvedValue({ data: LIST });
    render(<ConversationHistory activeId="c1" onOpen={vi.fn()} />);
    expect((await screen.findByRole('button', { name: /^¿dónde está trk-1/i })).getAttribute('aria-current')).toBe('true');
  });

  it('borrar pide confirmación explicando que no se puede deshacer, y recién entonces borra', async () => {
    apiService.getAiConversations.mockResolvedValue({ data: LIST });
    apiService.deleteAiConversation.mockResolvedValue({});
    render(<ConversationHistory onOpen={vi.fn()} />);
    await userEvent.click(await screen.findByRole('button', { name: /eliminar la conversación "resumen del día"/i }));

    const dialog = await screen.findByRole('dialog', { name: /eliminar conversación/i });
    expect(dialog).toHaveTextContent(/no se puede deshacer/i);
    expect(apiService.deleteAiConversation).not.toHaveBeenCalled();

    apiService.getAiConversations.mockResolvedValue({ data: [LIST[0]] });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Eliminar' }));
    await waitFor(() => expect(apiService.deleteAiConversation).toHaveBeenCalledWith('c2'));
    await waitFor(() => expect(screen.queryByText('Resumen del día')).not.toBeInTheDocument());
  });

  it('cancelar la confirmación no borra nada', async () => {
    apiService.getAiConversations.mockResolvedValue({ data: LIST });
    render(<ConversationHistory onOpen={vi.fn()} />);
    await userEvent.click(await screen.findByRole('button', { name: /eliminar la conversación "resumen del día"/i }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
    expect(apiService.deleteAiConversation).not.toHaveBeenCalled();
  });

  it('si se borra la conversación abierta, avisa para vaciar la pantalla', async () => {
    apiService.getAiConversations.mockResolvedValue({ data: LIST });
    apiService.deleteAiConversation.mockResolvedValue({});
    const onDeleted = vi.fn();
    render(<ConversationHistory activeId="c1" onOpen={vi.fn()} onDeleted={onDeleted} />);
    await userEvent.click(await screen.findByRole('button', { name: /eliminar la conversación "¿dónde está trk-1\?"/i }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Eliminar' }));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith('c1'));
  });

  it('sin conversaciones lo explica; en modo compacto no ocupa lugar', async () => {
    apiService.getAiConversations.mockResolvedValue({ data: [] });
    const { container, unmount } = render(<ConversationHistory onOpen={vi.fn()} />);
    expect(await screen.findByText(/todavía no tienes conversaciones/i)).toBeInTheDocument();
    unmount();

    const compact = render(<ConversationHistory compact onOpen={vi.fn()} />);
    await waitFor(() => expect(apiService.getAiConversations).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(compact.container).toBeEmptyDOMElement());
    void container;
  });

  it('si falla la carga ofrece reintentar; en modo compacto se oculta sin molestar', async () => {
    apiService.getAiConversations.mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce({ data: LIST });
    render(<ConversationHistory onOpen={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/no se pudo cargar/i);
    await userEvent.click(screen.getByRole('button', { name: /reintentar/i }));
    expect(await screen.findByText('Resumen del día')).toBeInTheDocument();
  });

  it('refreshConversationList actualiza las listas visibles (tras guardar una respuesta)', async () => {
    apiService.getAiConversations.mockResolvedValueOnce({ data: [LIST[0]] });
    render(<ConversationHistory onOpen={vi.fn()} />);
    await screen.findByText('¿Dónde está TRK-1?');
    apiService.getAiConversations.mockResolvedValueOnce({ data: LIST });
    act(() => refreshConversationList());
    expect(await screen.findByText('Resumen del día')).toBeInTheDocument();
  });
});

describe('El chat guarda y reabre conversaciones', () => {
  it('envía el id de la conversación en los mensajes siguientes y lo recuerda', async () => {
    apiService.chatStream.mockResolvedValueOnce({ response: 'uno', attachments: [], conversation_id: 'conv-1' });
    const { result } = renderHook(() => useChatState());
    await act(async () => { await result.current.send('primera'); });
    expect(apiService.chatStream.mock.calls[0][0].conversation_id).toBeUndefined();
    expect(result.current.conversationId).toBe('conv-1');

    apiService.chatStream.mockResolvedValueOnce({ response: 'dos', attachments: [], conversation_id: 'conv-1' });
    await act(async () => { await result.current.send('segunda'); });
    expect(apiService.chatStream.mock.calls[1][0].conversation_id).toBe('conv-1');
  });

  it('"Nueva conversación" (reset) olvida la conversación: el siguiente mensaje abre otra', async () => {
    apiService.chatStream.mockResolvedValue({ response: 'x', attachments: [], conversation_id: 'conv-1' });
    const { result } = renderHook(() => useChatState());
    await act(async () => { await result.current.send('a'); });
    act(() => result.current.reset([]));
    expect(result.current.conversationId).toBeNull();
    await act(async () => { await result.current.send('b'); });
    expect(apiService.chatStream.mock.calls[1][0].conversation_id).toBeUndefined();
  });

  it('abrir una conversación carga sus mensajes (con tarjetas) y continúa en la misma', async () => {
    apiService.getAiConversation.mockResolvedValue({ data: { messages: [
      { role: 'user', content: '¿Dónde está TRK-1?' },
      { role: 'assistant', content: 'Está en La Paz.', attachments: [{ kind: 'package_tracking' }], is_error: false },
      { role: 'assistant', content: 'falló', attachments: [], is_error: true },
    ] } });
    const { result } = renderHook(() => useChatState());
    let ok;
    await act(async () => { ok = await result.current.openConversation('conv-9'); });
    expect(ok).toBe(true);
    expect(result.current.conversationId).toBe('conv-9');
    expect(result.current.messages.map((m) => m.role)).toEqual(['user', 'assistant', 'assistant']);
    expect(result.current.messages[1].attachments).toEqual([{ kind: 'package_tracking' }]);
    expect(result.current.messages[2].isError).toBe(true);

    apiService.chatStream.mockResolvedValue({ response: 'sí', attachments: [], conversation_id: 'conv-9' });
    await act(async () => { await result.current.send('¿y quién lo lleva?'); });
    const body = apiService.chatStream.mock.calls[0][0];
    expect(body.conversation_id).toBe('conv-9');
    expect(body.history).toEqual([{ role: 'user', content: '¿Dónde está TRK-1?' }, { role: 'assistant', content: 'Está en La Paz.' }]); // el error no es contexto
  });

  it('si no se puede abrir, devuelve false y no cambia lo que hay en pantalla', async () => {
    apiService.getAiConversation.mockRejectedValue(new Error('404'));
    const { result } = renderHook(() => useChatState());
    let ok;
    await act(async () => { ok = await result.current.openConversation('nope'); });
    expect(ok).toBe(false);
    expect(result.current.conversationId).toBeNull();
  });
});

describe('Página de uso de la IA', () => {
  const USAGE = {
    days: 7, truncated: false,
    totals: { queries: 42, ok: 40, errors: 2, success_pct: 95.2, median_ms: 2400, p90_ms: 6100, tokens: 183000, avg_tokens: 4357, fast_path_pct: 38.1, streamed_pct: 90, voice_pct: 4.8, active_users: 3 },
    by_model: [{ model: 'cerebras:qwen-3.8-27b', queries: 30, ok: 30, errors: 0, success_pct: 100, avg_ms: 2100, p90_ms: 4000, tokens: 120000, avg_tokens: 4000 }, { model: 'gemini:gemini-flash-lite-latest', queries: 12, ok: 10, errors: 2, success_pct: 83.3, avg_ms: 6500, p90_ms: 9000, tokens: 63000, avg_tokens: 5250 }],
    by_day: [{ date: '2026-11-21', queries: 10, errors: 0, tokens: 40000 }, { date: '2026-11-22', queries: 32, errors: 2, tokens: 143000 }],
    top_tools: [{ tool: 'get_package_tracking', count: 20 }, { tool: 'get_daily_briefing', count: 9 }],
    by_role: [{ role: 'admin', queries: 30 }, { role: 'client', queries: 12 }],
    recent_errors: [{ at: '2026-11-22T14:00:00Z', model: 'gemini:gemini-flash-lite-latest', status: 429 }],
    pool: { strategy: 'balanced', models: [{ id: 'groq:openai/gpt-oss-20b', available: false, cooldown_seconds: 35, ok: 4, failed: 1, avg_ms: 2500, tpm: 8000, tokens_last_minute: 7100, last_error: '429 Rate limit' }, { id: 'cerebras:qwen-3.8-27b', available: true, cooldown_seconds: 0, ok: 30, failed: 0, avg_ms: 2100, tpm: 150000, tokens_last_minute: 9000 }] },
  };
  const renderPage = () => render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter><AiUsagePage /></MemoryRouter>
    </QueryClientProvider>,
  );

  it('muestra las cifras principales en lenguaje claro', async () => {
    apiService.getAiUsage.mockResolvedValue({ data: USAGE });
    renderPage();
    expect(await screen.findByText('42')).toBeInTheDocument(); // consultas
    expect(screen.getByText('95.2%')).toBeInTheDocument();
    expect(screen.getByText('2.4 s')).toBeInTheDocument(); // tiempo típico
    expect(screen.getByText(/9 de cada 10 en menos de 6\.1 s/)).toBeInTheDocument();
    expect(screen.getByText('183 mil')).toBeInTheDocument();
    expect(screen.getByText('38.1%')).toBeInTheDocument(); // atajo
  });

  it('detalla cada modelo en una tabla accesible', async () => {
    apiService.getAiUsage.mockResolvedValue({ data: USAGE });
    renderPage();
    const table = await screen.findByRole('table', { name: /por modelo/i });
    const row = within(table).getByRole('row', { name: /gemini/i });
    expect(row).toHaveTextContent('83.3%');
    expect(row).toHaveTextContent('6.5 s');
  });

  it('traduce las herramientas a nombres entendibles y muestra el reparto por rol', async () => {
    apiService.getAiUsage.mockResolvedValue({ data: USAGE });
    renderPage();
    expect(await screen.findByText('Ubicar un paquete')).toBeInTheDocument();
    expect(screen.getByText('Resumen del día')).toBeInTheDocument();
    expect(screen.getByText(/Administrador 30/)).toBeInTheDocument();
  });

  it('el gráfico diario tiene texto alternativo con los valores', async () => {
    apiService.getAiUsage.mockResolvedValue({ data: USAGE });
    renderPage();
    expect(await screen.findByRole('img', { name: /32 consultas el 2026-11-22, 2 con error/ })).toBeInTheDocument();
  });

  it('indica qué modelo está descansando y por qué', async () => {
    apiService.getAiUsage.mockResolvedValue({ data: USAGE });
    renderPage();
    expect(await screen.findByText('Descansa 35s')).toBeInTheDocument();
    expect(screen.getByText('Disponible')).toBeInTheDocument();
    expect(screen.getByText(/Último error: 429 Rate limit/)).toBeInTheDocument();
  });

  it('cambiar el período vuelve a pedir los datos', async () => {
    apiService.getAiUsage.mockResolvedValue({ data: USAGE });
    renderPage();
    await screen.findByText('42');
    expect(apiService.getAiUsage).toHaveBeenLastCalledWith(7);
    await userEvent.click(screen.getByRole('button', { name: '30 días' }));
    await waitFor(() => expect(apiService.getAiUsage).toHaveBeenLastCalledWith(30));
    expect(screen.getByRole('button', { name: '30 días' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('sin consultas en el período lo explica en vez de mostrar ceros', async () => {
    apiService.getAiUsage.mockResolvedValue({ data: { ...USAGE, totals: { ...USAGE.totals, queries: 0 }, by_model: [], top_tools: [], recent_errors: [] } });
    renderPage();
    expect(await screen.findByText(/aún no hay consultas en este período/i)).toBeInTheDocument();
  });

  it('si falla la carga ofrece reintentar', async () => {
    apiService.getAiUsage.mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce({ data: USAGE });
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /reintentar/i }));
    expect(await screen.findByText('42')).toBeInTheDocument();
  });

  it('aclara que no se guarda el texto de las preguntas', async () => {
    apiService.getAiUsage.mockResolvedValue({ data: USAGE });
    renderPage();
    expect(await screen.findByText(/nunca el texto de las preguntas/i)).toBeInTheDocument();
  });
});
