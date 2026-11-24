import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AssistantChatProvider } from './AssistantChatProvider';
import useAssistantChat from './useAssistantChat';
import apiService from '../../services/apiService';

let mockUser = { id: 'u1' };
vi.mock('../../app/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
vi.mock('../../services/apiService', () => ({ default: { getAiConversation: vi.fn(), post: vi.fn() } }));

const KEY = 'logisticaspa:asistente:conversacion:u1';
let chat;
function Probe() {
  chat = useAssistantChat();
  return <p>mensajes: {chat.messages.map((m) => m.content).join(' | ') || 'ninguno'}</p>;
}
const mount = () => render(<AssistantChatProvider><Probe /></AssistantChatProvider>);

describe('La conversación del asistente sobrevive a recargar la pestaña', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    mockUser = { id: 'u1' };
    apiService.getAiConversation.mockReset();
  });

  it('reabre la conversación guardada desde el servidor', async () => {
    window.sessionStorage.setItem(KEY, 'conv-9');
    apiService.getAiConversation.mockResolvedValue({ data: { messages: [{ role: 'user', content: 'hola' }, { role: 'assistant', content: 'buenas' }] } });
    mount();
    expect(await screen.findByText(/hola \| buenas/)).toBeInTheDocument();
    expect(apiService.getAiConversation).toHaveBeenCalledWith('conv-9');
    expect(window.sessionStorage.getItem(KEY)).toBe('conv-9'); // no se pierde mientras se reabre
  });

  it('si la conversación ya no existe, empieza de cero y olvida el identificador', async () => {
    window.sessionStorage.setItem(KEY, 'conv-borrada');
    apiService.getAiConversation.mockRejectedValue(new Error('404'));
    mount();
    await waitFor(() => expect(window.sessionStorage.getItem(KEY)).toBeNull());
    expect(screen.getByText(/ninguno/)).toBeInTheDocument();
  });

  it('recuerda la conversación abierta y la olvida con "Nueva conversación"', async () => {
    apiService.getAiConversation.mockResolvedValue({ data: { messages: [{ role: 'user', content: 'x' }] } });
    mount();
    await act(async () => { await chat.openConversation('conv-1'); });
    expect(window.sessionStorage.getItem(KEY)).toBe('conv-1');

    act(() => chat.reset([]));
    expect(window.sessionStorage.getItem(KEY)).toBeNull();
  });

  it('sin conversación guardada no consulta al servidor', () => {
    mount();
    expect(apiService.getAiConversation).not.toHaveBeenCalled();
  });

  it('otro usuario no recibe la conversación del anterior', async () => {
    window.sessionStorage.setItem(KEY, 'conv-9');
    mockUser = { id: 'u2' };
    mount();
    expect(apiService.getAiConversation).not.toHaveBeenCalled();
    expect(screen.getByText(/ninguno/)).toBeInTheDocument();
  });
});

describe('Cerrar sesión', () => {
  it('olvida la conversación guardada de ese usuario', () => {
    window.sessionStorage.setItem(KEY, 'conv-9');
    mockUser = { id: 'u1' };
    apiService.getAiConversation.mockResolvedValue({ data: { messages: [] } });
    const { rerender } = render(<AssistantChatProvider><Probe /></AssistantChatProvider>);
    mockUser = null;
    rerender(<AssistantChatProvider><Probe /></AssistantChatProvider>);
    expect(window.sessionStorage.getItem(KEY)).toBeNull();
  });
});
