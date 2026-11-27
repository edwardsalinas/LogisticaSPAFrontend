import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LogiActivity from './LogiActivity';
import apiService from '../../../services/apiService';

vi.mock('../../../services/apiService', () => ({ default: { unassignPackage: vi.fn(), cancelPackage: vi.fn(), post: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const rec = (id, code, status) => ({ id, tracking_code: code, status });
const chatWith = (...outcomes) => ({ actionOutcomes: new Map(outcomes.map((o, i) => [`a${i}`, { status: 'done', at: Date.now() - i * 1000, ...o }])) });
const view = (chat) => render(<MemoryRouter><LogiActivity chat={chat} /></MemoryRouter>);

describe('LogiActivity: registro con «Deshacer»', () => {
  beforeEach(() => { apiService.unassignPackage.mockReset(); apiService.cancelPackage.mockReset(); apiService.post.mockReset(); });

  it('sin acciones muestra un mensaje claro', () => {
    view({ actionOutcomes: new Map() });
    expect(screen.getByText(/todavía no hubo acciones/i)).toBeInTheDocument();
  });

  it('asignar: «Deshacer la asignación» desasigna cada paquete', async () => {
    apiService.unassignPackage.mockResolvedValue({});
    view(chatWith({ type: 'assign_package', title: 'Asignar', records: [rec('1', 'TRK-1', 'asignado'), rec('2', 'TRK-2', 'asignado')] }));
    await userEvent.click(screen.getByRole('button', { name: /deshacer la asignación/i }));
    await waitFor(() => expect(apiService.unassignPackage).toHaveBeenCalledTimes(2));
    expect(await screen.findAllByText('Vuelto a pendientes')).toHaveLength(2);
  });

  it('crear: «Deshacer: anular el paquete» lo cancela; si el servidor lo rechaza, se explica', async () => {
    apiService.cancelPackage.mockRejectedValue(new Error('El paquete se creó hace más de 2 horas'));
    view(chatWith({ type: 'create_package', title: 'Crear', records: [rec('9', 'TRK-9', 'pendiente')] }));
    await userEvent.click(screen.getByRole('button', { name: /anular el paquete/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/más de 2 horas/);
    expect(apiService.cancelPackage).toHaveBeenCalledWith('9');
  });

  it('registrar evento o entregar NO ofrecen deshacer', () => {
    view(chatWith({ type: 'register_event', title: 'Evento', records: [rec('3', 'TRK-3', 'en_transito')] }, { type: 'deliver_packages', title: 'Entrega', records: [rec('4', 'TRK-4', 'entregado')] }));
    expect(screen.queryByRole('button', { name: /deshacer/i })).toBeNull();
  });

  it('reprogramar o cambiar un vehículo: «Deshacer» manda solo el identificador del servidor', async () => {
    apiService.post.mockResolvedValue({ result: { message: 'El viaje volvió a su hora anterior.' } });
    view(chatWith({ type: 'reschedule_trip', title: 'Reprogramar un viaje', undo: { id: 'u-123', label: 'Volver a la hora anterior' } }));
    await userEvent.click(screen.getByRole('button', { name: 'Volver a la hora anterior' }));
    await waitFor(() => expect(apiService.post).toHaveBeenCalledWith('/ai-agent/undo/u-123'));
    expect(apiService.post).toHaveBeenCalledTimes(1); // sin cuerpo: el navegador no manda qué deshacer
    expect(await screen.findByText('Deshecho.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Volver a la hora anterior' })).toBeNull();
  });

  it('si el servidor rechaza el deshacer (ya cambió, venció) se explica y se puede reintentar', async () => {
    apiService.post.mockRejectedValue(new Error('Alguien cambió este vehículo después: ya no se puede devolver.'));
    view(chatWith({ type: 'update_vehicle', title: 'Cambiar un vehículo', undo: { id: 'u-9', label: 'Deshacer el cambio del vehículo' } }));
    await userEvent.click(screen.getByRole('button', { name: 'Deshacer el cambio del vehículo' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Alguien cambió este vehículo/);
    expect(screen.getByRole('button', { name: 'Deshacer el cambio del vehículo' })).toBeEnabled();
  });

  it('cancelar un viaje (sin deshacer) no ofrece ningún botón', () => {
    view(chatWith({ type: 'cancel_trip', title: 'Cancelar un viaje' }));
    expect(screen.queryByRole('button', { name: /deshacer|volver/i })).toBeNull();
  });
});

