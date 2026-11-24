import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActionProposalCard, AttachmentCard } from './AssistantCards';
import { ChatContext } from '../useAssistantChat';
import ChatBubble from './ChatBubble';
import apiService from '../../../services/apiService';

vi.mock('../../../services/apiService', () => ({ default: { post: vi.fn() } }));
let mockRole = 'admin';
vi.mock('../../../app/useRole', () => ({ default: () => ({ role: mockRole }) }));
// «Que Logi lo haga»: el motor se simula (null = fuera del layout)
let mockGuided = null;
vi.mock('../guided/GuidedRunProvider', () => ({ useGuidedRun: () => mockGuided, canGuide: (a) => !!a?.ui?.fill?.values }));

const ACTION = {
  kind: 'action_proposal',
  action: { id: '11111111-1111-4111-8111-111111111111', type: 'deliver_package', title: 'Confirmar entrega de un paquete', lines: ['Paquete: TRK-1', 'Destino: Oruro', 'Pasará a: Entregado'], expires_at: '2026-11-21T20:00:00Z' },
};

const RECORD = { id: 'pk-1', tracking_code: 'TRK-1', status: 'entregado', origen: 'La Paz', destino: 'Oruro', peso: 3, recipient_name: 'Ana Gómez', trip: 'La Paz → Oruro' };

const renderCard = () => render(<MemoryRouter><ActionProposalCard data={ACTION} /></MemoryRouter>);

describe('Acciones del asistente: tarjeta de confirmación', () => {
  beforeEach(() => { apiService.post.mockReset(); mockRole = 'admin'; });

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

  it('tras confirmar muestra el estado real leído del sistema con un enlace a la ficha', async () => {
    apiService.post.mockResolvedValue({ success: true, result: { message: 'Hecho.', data: { records: [RECORD] } } });
    renderCard();
    await userEvent.click(screen.getByRole('button', { name: /^confirmar$/i }));

    expect(await screen.findByText(/comprobado en el sistema/i)).toBeInTheDocument();
    const lista = screen.getByRole('list', { name: /estado real de los paquetes/i });
    expect(lista).toHaveTextContent('La Paz → Oruro');
    expect(lista).toHaveTextContent('Ana Gómez');
    expect(screen.getByRole('link', { name: /ver paquete trk-1/i })).toHaveAttribute('href', '/logistics/packages/pk-1');
  });

  it('un conductor ve el estado pero no el enlace (no tiene la ficha de paquete)', async () => {
    mockRole = 'driver';
    apiService.post.mockResolvedValue({ success: true, result: { message: 'Hecho.', data: { records: [RECORD] } } });
    renderCard();
    await userEvent.click(screen.getByRole('button', { name: /^confirmar$/i }));

    expect(await screen.findByText(/comprobado en el sistema/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /ver paquete/i })).not.toBeInTheDocument();
  });

  it('si el servidor no pudo armar el recibo, el resultado se muestra igual sin esa sección', async () => {
    apiService.post.mockResolvedValue({ success: true, result: { message: 'Hecho.' } });
    renderCard();
    await userEvent.click(screen.getByRole('button', { name: /^confirmar$/i }));
    expect(await screen.findByText('Hecho.')).toBeInTheDocument();
    expect(screen.queryByText(/comprobado en el sistema/i)).not.toBeInTheDocument();
  });
});

describe('Acciones del asistente: «Que Logi lo haga»', () => {
  const GUIDABLE = {
    kind: 'action_proposal',
    action: { id: '22222222-2222-4222-8222-222222222222', type: 'create_package', title: 'Registrar un paquete nuevo', lines: ['Ruta: La Paz → Oruro'], expires_at: '2026-11-21T20:00:00Z', ui: { fill: { form: 'package', values: { origen: 'La Paz' } } } },
  };
  const renderGuidable = (ctx) => render(
    <MemoryRouter><ChatContext.Provider value={ctx}><ActionProposalCard data={GUIDABLE} /></ChatContext.Provider></MemoryRouter>,
  );
  beforeEach(() => { apiService.post.mockReset(); mockGuided = null; mockRole = 'admin'; });

  it('sin el motor (fuera del layout) o sin datos para llenar, no aparece el botón', () => {
    renderGuidable({});
    expect(screen.queryByRole('button', { name: /que logi lo haga/i })).not.toBeInTheDocument();
    mockGuided = { start: vi.fn() };
    render(<MemoryRouter><ActionProposalCard data={ACTION} /></MemoryRouter>); // entrega: no tiene coreografía
    expect(screen.queryByRole('button', { name: /que logi lo haga/i })).not.toBeInTheDocument();
  });

  it('con el motor y datos, ofrece el botón junto a Confirmar y Cancelar', () => {
    mockGuided = { start: vi.fn() };
    renderGuidable({});
    expect(screen.getByRole('button', { name: /que logi lo haga/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^confirmar$/i })).toBeInTheDocument();
  });

  it('los tres botones pueden pasar a otra línea: en el panel flotante (angosto) no deben desbordar la tarjeta', () => {
    mockGuided = { start: vi.fn() };
    renderGuidable({});
    const row = screen.getByRole('button', { name: /^confirmar$/i }).parentElement;
    expect(row.className).toContain('flex-wrap');
    expect(row.parentElement.className).toContain('flex-wrap');
  });

  it('al terminar Logi, la tarjeta queda igual que si se hubiera confirmado (y se recuerda)', async () => {
    mockGuided = { start: vi.fn().mockResolvedValue({ result: { result: { message: 'Paquete creado con el código TRK-5.' } } }) };
    const settleAction = vi.fn();
    renderGuidable({ settleAction });
    await userEvent.click(screen.getByRole('button', { name: /que logi lo haga/i }));
    expect(mockGuided.start).toHaveBeenCalledWith(GUIDABLE.action);
    expect(await screen.findByText(/TRK-5/)).toBeInTheDocument();
    expect(screen.getByText(/^hecho$/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^confirmar$/i })).not.toBeInTheDocument();
    expect(settleAction).toHaveBeenCalledWith(GUIDABLE.action.id, expect.objectContaining({ status: 'done' }));
    expect(apiService.post).not.toHaveBeenCalled(); // la confirmación la hizo el motor, no la tarjeta
  });

  it('si detienen a Logi, no se hizo nada y se puede confirmar o intentar otra vez', async () => {
    mockGuided = { start: vi.fn().mockResolvedValue({ stopped: true }) };
    renderGuidable({ settleAction: vi.fn() });
    await userEvent.click(screen.getByRole('button', { name: /que logi lo haga/i }));
    expect(await screen.findByRole('button', { name: /^confirmar$/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /que logi lo haga/i })).toBeEnabled();
    expect(screen.queryByText(/^hecho$/i)).not.toBeInTheDocument();
  });

  it('si Logi falla, muestra el error', async () => {
    mockGuided = { start: vi.fn().mockResolvedValue({ error: new Error('El viaje ya está lleno') }) };
    renderGuidable({ settleAction: vi.fn() });
    await userEvent.click(screen.getByRole('button', { name: /que logi lo haga/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('El viaje ya está lleno');
  });

  it('si Logi ya la resolvió con el panel cerrado, al reabrirlo la tarjeta nace con su resultado (sin pedir confirmar otra vez)', () => {
    mockGuided = { start: vi.fn() };
    const outcomes = new Map([[GUIDABLE.action.id, { status: 'done', message: 'Paquete creado con el código TRK-6.' }]]);
    renderGuidable({ actionOutcomes: outcomes });
    expect(screen.getByText(/TRK-6/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^confirmar$/i })).not.toBeInTheDocument();
  });
});
