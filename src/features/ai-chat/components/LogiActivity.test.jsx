import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LogiActivity from './LogiActivity';
import apiService from '../../../services/apiService';

vi.mock('../../../services/apiService', () => ({ default: { unassignPackage: vi.fn(), cancelPackage: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const rec = (id, code, status) => ({ id, tracking_code: code, status });
const chatWith = (...outcomes) => ({ actionOutcomes: new Map(outcomes.map((o, i) => [`a${i}`, { status: 'done', at: Date.now() - i * 1000, ...o }])) });
const view = (chat) => render(<MemoryRouter><LogiActivity chat={chat} /></MemoryRouter>);

describe('LogiActivity: registro con «Deshacer»', () => {
  beforeEach(() => { apiService.unassignPackage.mockReset(); apiService.cancelPackage.mockReset(); });

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
});
