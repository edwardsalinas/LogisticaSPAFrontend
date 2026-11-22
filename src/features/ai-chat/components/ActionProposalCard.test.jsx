import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActionProposalCard, AttachmentCard } from './AssistantCards';
import ChatBubble from './ChatBubble';
import apiService from '../../../services/apiService';

vi.mock('../../../services/apiService', () => ({ default: { post: vi.fn() } }));

const ACTION = {
  kind: 'action_proposal',
  action: { id: '11111111-1111-4111-8111-111111111111', type: 'deliver_package', title: 'Confirmar entrega de un paquete', lines: ['Paquete: TRK-1', 'Destino: Oruro', 'Pasará a: Entregado'], expires_at: '2026-11-21T20:00:00Z' },
};

const renderCard = () => render(<MemoryRouter><ActionProposalCard data={ACTION} /></MemoryRouter>);

describe('Acciones del asistente: tarjeta de confirmación', () => {
  beforeEach(() => apiService.post.mockReset());

  it('muestra el resumen y deja claro que todavía no se hizo nada', () => {
    renderCard();
    expect(screen.getByText('Confirmar entrega de un paquete')).toBeInTheDocument();
    expect(screen.getByText('Paquete: TRK-1')).toBeInTheDocument();
    expect(screen.getByText('Pasará a: Entregado')).toBeInTheDocument();
    expect(screen.getByText(/nada se ha hecho todavía/i)).toBeInTheDocument();
    expect(screen.getByText(/requiere tu confirmación/i)).toBeInTheDocument();
    expect(apiService.post).not.toHaveBeenCalled(); // mostrar la tarjeta no ejecuta nada
  });

  it('Confirmar llama al endpoint de confirmación y muestra el resultado', async () => {
    apiService.post.mockResolvedValue({ success: true, result: { message: 'Paquete TRK-1 marcado como entregado.' } });
    renderCard();
    await userEvent.click(screen.getByRole('button', { name: /^confirmar$/i }));

    expect(apiService.post).toHaveBeenCalledWith(`/ai-agent/actions/${ACTION.action.id}/confirm`);
    expect(await screen.findByText(/Paquete TRK-1 marcado como entregado\./)).toBeInTheDocument();
    expect(screen.getByText(/^hecho$/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^confirmar$/i })).not.toBeInTheDocument(); // ya no se puede repetir
  });

  it('Cancelar llama al endpoint de cancelación y no ejecuta la acción', async () => {
    apiService.post.mockResolvedValue({ success: true, result: { message: 'Acción cancelada. No se hizo ningún cambio.' } });
    renderCard();
    await userEvent.click(screen.getByRole('button', { name: /^cancelar$/i }));

    expect(apiService.post).toHaveBeenCalledTimes(1);
    expect(apiService.post).toHaveBeenCalledWith(`/ai-agent/actions/${ACTION.action.id}/cancel`);
    expect(await screen.findByText(/no se hizo ningún cambio/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^confirmar$/i })).not.toBeInTheDocument();
  });

  it('si el servidor rechaza la acción (permiso, vencida, ya ejecutada) muestra el motivo', async () => {
    // Función simple en vez de vi.fn().mockRejectedValue: Vitest marcaría como "no manejado" un rechazo que el componente sí captura
    const original = apiService.post;
    apiService.post = async () => { throw Object.assign(new Error('La acción venció. Pídesela de nuevo al asistente.'), { status: 410 }); };
    try {
      renderCard();
      await userEvent.click(screen.getByRole('button', { name: /^confirmar$/i }));
      expect(await screen.findByRole('alert')).toHaveTextContent(/la acción venció/i);
      expect(screen.queryByRole('button', { name: /^confirmar$/i })).not.toBeInTheDocument(); // no se reintenta a ciegas
    } finally {
      apiService.post = original;
    }
  });

  it('no se puede confirmar dos veces con clics seguidos', async () => {
    let release;
    apiService.post.mockReturnValue(new Promise((resolve) => { release = () => resolve({ result: { message: 'Listo' } }); }));
    renderCard();
    const confirm = screen.getByRole('button', { name: /^confirmar$/i });
    await userEvent.click(confirm);
    expect(screen.getByRole('button', { name: /ejecutando/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^cancelar$/i })).toBeDisabled(); // tampoco se cancela a mitad
    await userEvent.click(screen.getByRole('button', { name: /ejecutando/i }));
    release();
    await waitFor(() => expect(screen.getByText(/listo/i)).toBeInTheDocument());
    expect(apiService.post).toHaveBeenCalledTimes(1);
  });

  it('en el chat, la propuesta aparece como tarjeta dentro de la respuesta del asistente', async () => {
    render(
      <MemoryRouter>
        <ChatBubble message={{ role: 'assistant', content: 'Preparé la entrega. **Confírmala** en la tarjeta.', attachments: [ACTION] }} role="admin" />
      </MemoryRouter>
    );
    expect(await screen.findByText('Confírmala', { selector: 'strong' }, { timeout: 8000 })).toBeInTheDocument(); // el markdown se carga bajo demanda
    expect(screen.getByRole('button', { name: /^confirmar$/i })).toBeInTheDocument();
  });

  it('un tipo de tarjeta desconocido no rompe el chat', () => {
    const { container } = render(<AttachmentCard attachment={{ kind: 'otra_cosa' }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
