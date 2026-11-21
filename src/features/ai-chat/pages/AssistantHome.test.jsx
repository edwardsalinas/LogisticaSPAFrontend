import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AssistantHome, { displayName } from './AssistantHome';
import apiService from '../../../services/apiService';
import { timeAgo, formatDateTime } from '../components/AssistantCards';

let mockUser;
vi.mock('../../../app/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
vi.mock('../../../services/apiService', () => ({ default: { post: vi.fn() } }));

const renderHome = () => render(<MemoryRouter><AssistantHome /></MemoryRouter>);
const ask = async (text) => {
  await userEvent.type(screen.getByLabelText(/mensaje para el asistente/i), text);
  await userEvent.click(screen.getByRole('button', { name: /^enviar$/i }));
};

const TRACKING = {
  kind: 'package_tracking',
  package: { tracking_code: 'TRK-123', status: 'en_transito', origen: 'La Paz', destino: 'Oruro', delivered_at: null },
  route: { driver_name: 'Carlos Mendoza', vehicle: 'ABC-123 Volvo FH16', estimated_arrival: '2026-11-21T20:00:00Z' },
  location: { at: new Date(Date.now() - 20 * 60000).toISOString(), last_event: 'En tránsito: Caracollo', nearest_checkpoint: { name: 'Caracollo', distance_km: 1.2 }, km_to_destination: 95.4 },
  timeline: [{ status: 'En tránsito: Caracollo', at: '2026-11-21T18:00:00Z', note: null }],
};

describe('Vista del asistente (Modo IA)', () => {
  beforeEach(() => {
    apiService.post.mockReset();
    mockUser = { id: 'u1', email: 'maria@logistica.bo', user_metadata: { full_name: 'María López' }, app_metadata: { role: 'client' } };
  });

  it('abre con un saludo por el nombre y preguntas sugeridas para el rol', () => {
    renderHome();
    expect(screen.getByRole('heading', { name: /hola, maría/i })).toBeInTheDocument();
    expect(screen.getByText(/¿en qué te puedo ayudar hoy\?/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /¿qué paquetes tengo\?/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cómo va la operación/i })).not.toBeInTheDocument(); // eso es del staff
  });

  it('el staff ve preguntas de operación y el conductor las suyas', () => {
    mockUser = { ...mockUser, app_metadata: { role: 'admin' } };
    const { unmount } = renderHome();
    expect(screen.getByRole('button', { name: /¿cómo va la operación hoy\?/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /vehículos hay disponibles/i })).toBeInTheDocument();
    unmount();

    mockUser = { ...mockUser, app_metadata: { role: 'driver' } };
    renderHome();
    expect(screen.getByRole('button', { name: /¿qué entregas tengo hoy\?/i })).toBeInTheDocument();
  });

  it('tocar una sugerencia envía la pregunta', async () => {
    apiService.post.mockResolvedValue({ response: 'Tienes 2 paquetes.', attachments: [] });
    renderHome();
    await userEvent.click(screen.getByRole('button', { name: /¿qué paquetes tengo\?/i }));
    expect(await screen.findByText('Tienes 2 paquetes.')).toBeInTheDocument();
    expect(apiService.post).toHaveBeenCalledWith('/ai-agent/chat', { message: '¿Qué paquetes tengo?', history: [] });
  });

  it('las sugerencias de "completar" rellenan el campo en vez de enviar', async () => {
    mockUser = { ...mockUser, app_metadata: { role: 'admin' } };
    renderHome();
    await userEvent.click(screen.getByRole('button', { name: /buscar por nombre/i }));
    expect(screen.getByLabelText(/mensaje para el asistente/i)).toHaveValue('Busca el paquete a nombre de ');
    expect(apiService.post).not.toHaveBeenCalled();
  });

  it('muestra la respuesta como markdown y la ficha del paquete con sus datos', async () => {
    apiService.post.mockResolvedValue({ response: 'Tu paquete **TRK-123** va en camino.', attachments: [TRACKING] });
    renderHome();
    await ask('¿Dónde está TRK-123?');

    expect(await screen.findByText('TRK-123', { selector: 'strong' })).toBeInTheDocument(); // negrita real, sin asteriscos
    expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument();
    expect(screen.getByText('Carlos Mendoza')).toBeInTheDocument();
    expect(screen.getByText('ABC-123 Volvo FH16')).toBeInTheDocument();
    expect(screen.getByText(/cerca de caracollo, a 95.4 km del destino/i)).toBeInTheDocument();
    expect(screen.getByText(/hace 20 min/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /¿cuándo llegará\?/i })).toBeInTheDocument(); // seguimiento sugerido
  });

  it('una lista de paquetes se puede tocar para preguntar por uno', async () => {
    apiService.post
      .mockResolvedValueOnce({ response: 'Estos son tus paquetes.', attachments: [{ kind: 'package_list', title: 'Tus paquetes', packages: [{ tracking_code: 'TRK-9', status: 'entregado', origen: 'La Paz', destino: 'Oruro' }] }] })
      .mockResolvedValueOnce({ response: 'Ese paquete ya fue entregado.', attachments: [] });
    renderHome();
    await ask('¿Qué paquetes tengo?');
    await userEvent.click(await screen.findByRole('button', { name: /TRK-9/ }));

    await waitFor(() => expect(apiService.post).toHaveBeenLastCalledWith('/ai-agent/chat', expect.objectContaining({ message: '¿Dónde está el paquete TRK-9?' })));
    expect(await screen.findByText('Ese paquete ya fue entregado.')).toBeInTheDocument();
  });

  it('"Nueva conversación" vuelve a la pantalla inicial', async () => {
    apiService.post.mockResolvedValue({ response: 'Respuesta', attachments: [] });
    renderHome();
    await ask('hola');
    await screen.findByText('Respuesta');
    await userEvent.click(screen.getByRole('button', { name: /nueva conversación/i }));
    expect(screen.getByRole('heading', { name: /hola, maría/i })).toBeInTheDocument();
  });

  it('un error del servidor se explica sin detalles internos', async () => {
    apiService.post.mockRejectedValue(Object.assign(new Error('secreto interno'), { status: 503 }));
    renderHome();
    await ask('hola');
    expect(await screen.findByText(/muchas consultas/i)).toBeInTheDocument();
    expect(screen.queryByText(/secreto interno/)).not.toBeInTheDocument();
  });

  it('el HTML dentro de la respuesta del modelo no se ejecuta (markdown seguro)', async () => {
    apiService.post.mockResolvedValue({ response: 'Hola <img src=x onerror="window.__xss=1"> <script>window.__xss=1</script>', attachments: [] });
    const { container } = renderHome();
    await ask('hola');
    await screen.findByText(/Hola/);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
    expect(window.__xss).toBeUndefined();
  });
});

describe('utilidades de la vista', () => {
  it('displayName: nombre de pila, o el usuario del correo', () => {
    expect(displayName({ user_metadata: { full_name: 'Ana Gómez Pérez' } })).toBe('Ana');
    expect(displayName({ email: 'carlos@logistica.bo' })).toBe('Carlos');
    expect(displayName(null)).toBe('');
  });

  it('timeAgo: minutos, horas y días', () => {
    const now = Date.parse('2026-11-21T12:00:00Z');
    expect(timeAgo('2026-11-21T11:59:40Z', now)).toBe('justo ahora');
    expect(timeAgo('2026-11-21T11:30:00Z', now)).toBe('hace 30 min');
    expect(timeAgo('2026-11-21T09:00:00Z', now)).toBe('hace 3 h');
    expect(timeAgo('2026-11-19T12:00:00Z', now)).toBe('hace 2 días');
    expect(timeAgo('no-es-fecha', now)).toBeNull();
  });

  it('formatDateTime: sin fecha o inválida devuelve null', () => {
    expect(formatDateTime(null)).toBeNull();
    expect(formatDateTime('xx')).toBeNull();
    expect(formatDateTime('2026-11-21T20:00:00Z')).toMatch(/\d/);
  });
});
