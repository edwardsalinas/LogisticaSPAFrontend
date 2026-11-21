import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ShipmentAssignmentForm from './ShipmentAssignmentForm';
import apiService from '../../../services/apiService';

vi.mock('../../../services/apiService', () => ({
  default: { getRoutes: vi.fn(), assignPackageToRoute: vi.fn() },
}));

const PKG = { id: 'p1', tracking_code: 'TRK-1', origen: 'La Paz', destino: 'Oruro' };
const ROUTES = [
  { id: 'r1', route_code: 'RT-1', origin: 'La Paz', destination: 'Oruro', status: 'planeada', departure_time: '2026-03-20T10:00:00Z' },
  { id: 'r2', route_code: 'RT-2', origin: 'La Paz', destination: 'Oruro', status: 'completada', departure_time: '2026-03-01T10:00:00Z' },
  { id: 'r3', route_code: 'RT-3', origin: 'Cochabamba', destination: 'Oruro', status: 'planeada', departure_time: '2026-03-20T10:00:00Z' },
];

describe('ShipmentAssignmentForm (React Hook Form + Zod)', () => {
  beforeEach(() => {
    apiService.getRoutes.mockResolvedValue({ data: ROUTES });
    apiService.assignPackageToRoute.mockReset();
  });

  it('solo ofrece despachos del mismo trayecto que no estén completados', async () => {
    render(<ShipmentAssignmentForm pkg={PKG} onSuccess={vi.fn()} onCancel={vi.fn()} />);
    expect(await screen.findByRole('option', { name: /RT-1/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /RT-2/ })).not.toBeInTheDocument(); // completado
    expect(screen.queryByRole('option', { name: /RT-3/ })).not.toBeInTheDocument(); // otro trayecto
  });

  it('exige seleccionar un despacho antes de asignar', async () => {
    render(<ShipmentAssignmentForm pkg={PKG} onSuccess={vi.fn()} onCancel={vi.fn()} />);
    await screen.findByRole('option', { name: /RT-1/ });
    await userEvent.click(screen.getByRole('button', { name: /confirmar asignación/i }));
    // el botón se deshabilita mientras no haya selección; no se llama al backend
    expect(apiService.assignPackageToRoute).not.toHaveBeenCalled();
  });

  it('asigna el paquete a la ruta elegida', async () => {
    apiService.assignPackageToRoute.mockResolvedValue({});
    const onSuccess = vi.fn();
    render(<ShipmentAssignmentForm pkg={PKG} onSuccess={onSuccess} onCancel={vi.fn()} />);
    await screen.findByRole('option', { name: /RT-1/ });
    await userEvent.selectOptions(screen.getByLabelText(/despachos disponibles/i), 'r1');
    await userEvent.click(screen.getByRole('button', { name: /confirmar asignación/i }));

    await waitFor(() => expect(apiService.assignPackageToRoute).toHaveBeenCalledWith('r1', 'p1'));
    expect(onSuccess).toHaveBeenCalled();
  });
});
