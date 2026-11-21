import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AiAssistantPanel from './AiAssistantPanel';
import apiService from '../../../services/apiService';

vi.mock('../../../services/apiService', () => ({
  default: { post: vi.fn() },
}));

const send = async (text) => {
  await userEvent.type(screen.getByLabelText(/mensaje para el asistente/i), text);
  await userEvent.click(screen.getByRole('button', { name: /enviar/i }));
};

describe('AiAssistantPanel (conectado al backend)', () => {
  beforeEach(() => {
    apiService.post.mockReset();
  });

  it('envía el mensaje a /ai-agent/chat y muestra la respuesta real', async () => {
    apiService.post.mockResolvedValue({ success: true, response: 'Tu paquete está en tránsito hacia Oruro.' });
    render(<AiAssistantPanel />);
    await send('Estado de TRK-123');

    expect(await screen.findByText('Tu paquete está en tránsito hacia Oruro.')).toBeInTheDocument();
    expect(apiService.post).toHaveBeenCalledWith('/ai-agent/chat', { message: 'Estado de TRK-123', history: [] });
  });

  it('envía la conversación previa como contexto (sin el saludo inicial)', async () => {
    apiService.post
      .mockResolvedValueOnce({ success: true, response: 'Primera respuesta' })
      .mockResolvedValueOnce({ success: true, response: 'Segunda respuesta' });
    render(<AiAssistantPanel />);
    await send('Primera pregunta');
    await screen.findByText('Primera respuesta');
    await send('Segunda pregunta');
    await screen.findByText('Segunda respuesta');

    expect(apiService.post).toHaveBeenLastCalledWith('/ai-agent/chat', {
      message: 'Segunda pregunta',
      history: [
        { role: 'user', content: 'Primera pregunta' },
        { role: 'assistant', content: 'Primera respuesta' },
      ],
    });
  });

  it('informa el límite de uso (429)', async () => {
    apiService.post.mockRejectedValue(Object.assign(new Error('rate'), { status: 429 }));
    render(<AiAssistantPanel />);
    await send('hola');
    expect(await screen.findByText(/muchas consultas/i)).toBeInTheDocument();
  });

  it('muestra un mensaje genérico ante cualquier otro error, sin exponer detalles', async () => {
    apiService.post.mockRejectedValue(new Error('detalle interno secreto'));
    render(<AiAssistantPanel />);
    await send('hola');
    expect(await screen.findByText(/no pude procesar tu consulta/i)).toBeInTheDocument();
    expect(screen.queryByText(/detalle interno secreto/)).not.toBeInTheDocument();
  });

  it('no envía mensajes vacíos', async () => {
    render(<AiAssistantPanel />);
    expect(screen.getByRole('button', { name: /enviar/i })).toBeDisabled();
    expect(apiService.post).not.toHaveBeenCalled();
  });
});
