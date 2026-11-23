import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiService from '../../../services/apiService';
import { AttachmentCard } from './AssistantCards';

vi.mock('../../../services/apiService', () => ({ default: { prepareAssignment: vi.fn(), post: vi.fn() } }));

const GROUP_A = {
  route_ref: 'RT-1', origin: 'Cochabamba', destination: 'La Paz', departure_time: '2026-11-24T12:00:00Z', vehicle: 'Volvo FH16',
  capacity_unknown: false, free_kg: 900, remaining_kg: 870, total_kg: 30,
  packages: [{ tracking_code: 'TRK-1', peso: 10, recipient_name: 'Ana' }, { tracking_code: 'TRK-2', peso: 20, recipient_name: null }],
};
const GROUP_B = { ...GROUP_A, route_ref: 'RT-2', origin: 'Oruro', destination: 'La Paz', total_kg: 5, remaining_kg: 95, packages: [{ tracking_code: 'TRK-3', peso: 5, recipient_name: 'Luis' }] };
const DATA = {
  kind: 'assignment_suggestions', total_loose: 4, assignable: 3, groups: [GROUP_A, GROUP_B],
  unassigned: [{ tracking_code: 'TRK-9', reason: 'no hay un viaje planeado de Cochabamba a Sucre' }],
};
const PROPOSAL = (id) => ({ kind: 'action_proposal', action: { id, type: 'assign_package', title: 'Asignar paquetes a un viaje', lines: ['Viaje: Cochabamba → La Paz'], expires_at: new Date(Date.now() + 600000).toISOString() }, skipped: [] });

const renderCard = (data = DATA) => render(<MemoryRouter><AttachmentCard attachment={data} role="admin" /></MemoryRouter>);

beforeEach(() => { apiService.prepareAssignment.mockReset(); apiService.post.mockReset(); });

describe('Tarjeta de sugerencias de asignación', () => {
  it('resume cuántos se pueden asignar y aclara que todavía no se asignó nada', () => {
    renderCard();
    expect(screen.getByText(/3 de 4 paquetes sueltos se pueden asignar/i)).toBeInTheDocument();
    expect(screen.getByText(/no se ha asignado nada todavía/i)).toBeInTheDocument();
  });

  it('muestra cada viaje con sus paquetes, pesos y el espacio que quedaría', () => {
    renderCard();
    expect(screen.getByText('Cochabamba → La Paz')).toBeInTheDocument();
    expect(screen.getByText(/quedan 870 kg libres/)).toBeInTheDocument();
    expect(screen.getByText('TRK-1')).toBeInTheDocument();
    expect(screen.getByText(/Ana/)).toBeInTheDocument();
    expect(screen.getByText('20 kg')).toBeInTheDocument();
    expect(screen.getByText('Oruro → La Paz')).toBeInTheDocument();
  });

  it('lista lo que no se pudo asignar, con el motivo, y enlaza a los viajes', () => {
    renderCard();
    const box = screen.getByText(/sin viaje por ahora \(1\)/i).closest('div');
    expect(within(box).getByText('TRK-9')).toBeInTheDocument();
    expect(within(box).getByText(/no hay un viaje planeado de Cochabamba a Sucre/)).toBeInTheDocument();
    expect(within(box).getByRole('link', { name: /revisar o crear viajes/i })).toHaveAttribute('href', '/logistics/routes');
  });

  it('avisa cuando un viaje no tiene dato de capacidad', () => {
    renderCard({ ...DATA, groups: [{ ...GROUP_A, capacity_unknown: true, remaining_kg: null }], assignable: 2 });
    expect(screen.getByText(/sin dato de capacidad/i)).toBeInTheDocument();
  });

  it('"Preparar asignación" crea la propuesta SIN llamar al modelo y la muestra para confirmar', async () => {
    apiService.prepareAssignment.mockResolvedValue({ data: PROPOSAL('p1') });
    renderCard({ ...DATA, groups: [GROUP_A] });
    await userEvent.click(screen.getByRole('button', { name: /preparar asignación \(2 paquetes, 30 kg\)/i }));

    expect(apiService.prepareAssignment).toHaveBeenCalledWith({ route_ref: 'RT-1', codes: ['TRK-1', 'TRK-2'] });
    expect(await screen.findByText('Asignar paquetes a un viaje')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^confirmar$/i })).toBeInTheDocument(); // sigue necesitando confirmación
    expect(screen.queryByRole('button', { name: /preparar asignación/i })).not.toBeInTheDocument();
    expect(apiService.post).not.toHaveBeenCalled(); // nada se ejecutó
  });

  it('confirmar la propuesta usa el flujo de acciones de siempre', async () => {
    apiService.prepareAssignment.mockResolvedValue({ data: PROPOSAL('p1') });
    apiService.post.mockResolvedValue({ result: { message: 'Listo: 2 paquetes asignados.' } });
    renderCard({ ...DATA, groups: [GROUP_A] });
    await userEvent.click(screen.getByRole('button', { name: /preparar asignación/i }));
    await userEvent.click(await screen.findByRole('button', { name: /^confirmar$/i }));
    await waitFor(() => expect(apiService.post).toHaveBeenCalledWith('/ai-agent/actions/p1/confirm'));
    expect(await screen.findByText(/2 paquetes asignados/)).toBeInTheDocument();
  });

  it('si el servidor rechaza (p. ej. el viaje se llenó), muestra el motivo y permite reintentar', async () => {
    apiService.prepareAssignment.mockRejectedValueOnce(Object.assign(new Error('El viaje no tiene espacio: quedan 5 kg.'), { status: 409 }));
    renderCard({ ...DATA, groups: [GROUP_A] });
    await userEvent.click(screen.getByRole('button', { name: /preparar asignación/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/no tiene espacio/i);

    apiService.prepareAssignment.mockResolvedValueOnce({ data: PROPOSAL('p2') });
    await userEvent.click(screen.getByRole('button', { name: /preparar asignación/i }));
    expect(await screen.findByText('Asignar paquetes a un viaje')).toBeInTheDocument();
  });

  it('con varios viajes ofrece preparar todos de una vez, en serie', async () => {
    apiService.prepareAssignment.mockResolvedValueOnce({ data: PROPOSAL('a') }).mockResolvedValueOnce({ data: PROPOSAL('b') });
    renderCard();
    await userEvent.click(screen.getByRole('button', { name: /preparar 2 asignaciones/i }));
    await waitFor(() => expect(apiService.prepareAssignment).toHaveBeenCalledTimes(2));
    expect(apiService.prepareAssignment.mock.calls.map((c) => c[0].route_ref)).toEqual(['RT-1', 'RT-2']);
    expect(await screen.findAllByText('Asignar paquetes a un viaje')).toHaveLength(2);
  });

  it('no ofrece "preparar todos" si hay un solo viaje', () => {
    renderCard({ ...DATA, groups: [GROUP_A] });
    expect(screen.queryByRole('button', { name: /preparar \d+ asignaciones/i })).not.toBeInTheDocument();
  });

  it('sin paquetes sueltos lo dice con claridad', () => {
    renderCard({ kind: 'assignment_suggestions', total_loose: 0, assignable: 0, groups: [], unassigned: [] });
    expect(screen.getByText(/no hay paquetes sueltos/i)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('los botones tienen tamaño táctil (≥44 px)', () => {
    renderCard();
    for (const b of screen.getAllByRole('button')) expect(b.className).toMatch(/min-h-11/);
  });
});
