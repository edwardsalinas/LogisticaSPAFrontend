import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RouteForm from './RouteForm';
import apiService from '../../../services/apiService';

// El mapa (Leaflet) se sustituye por un doble con botones que emiten origen y destino
vi.mock('../../../components/molecules/MapCheckpointsPicker', () => ({
  default: ({ onOriginSelect, onDestinationSelect }) => (
    <div>
      <button type="button" onClick={() => onOriginSelect({ lat: -16.5, lng: -68.15, name: 'La Paz' })}>mapa-origen</button>
      <button type="button" onClick={() => onDestinationSelect({ lat: -17.98, lng: -67.15, name: 'Oruro' })}>mapa-destino</button>
    </div>
  ),
}));

vi.mock('../../../services/apiService', () => ({
  default: {
    getDrivers: vi.fn(),
    getVehicles: vi.fn(),
    getPredefinedRoutes: vi.fn(),
    createRoute: vi.fn(),
    updateRoute: vi.fn(),
    createSchedule: vi.fn(),
  },
}));

const DRIVERS = [{ id: 'd1', full_name: 'Juan Perez' }];
const VEHICLES = [{ id: 'v1', plate: 'ABC-123', brand: 'Volvo', model: 'FH16' }];

const toLocalInput = (date) => {
  const d = new Date(date);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const inDays = (n) => toLocalInput(Date.now() + n * 86400000);

beforeEach(() => {
  apiService.getDrivers.mockResolvedValue({ data: DRIVERS });
  apiService.getVehicles.mockResolvedValue({ data: VEHICLES });
  apiService.getPredefinedRoutes.mockResolvedValue({ data: [] });
  apiService.createRoute.mockReset();
  apiService.updateRoute.mockReset();
  apiService.createSchedule.mockReset();
});

const renderForm = async (props = {}) => {
  const onSuccess = vi.fn();
  render(<RouteForm onSuccess={onSuccess} onCancel={vi.fn()} {...props} />);
  await screen.findByLabelText(/^conductor/i);
  return { onSuccess };
};

const pickBasics = async () => {
  await userEvent.selectOptions(screen.getByLabelText(/^conductor/i), 'd1');
  await userEvent.selectOptions(screen.getByLabelText(/^vehículo/i), 'v1');
  await userEvent.click(screen.getByRole('button', { name: 'mapa-origen' }));
  await userEvent.click(screen.getByRole('button', { name: 'mapa-destino' }));
};

describe('RouteForm (React Hook Form + Zod)', () => {
  it('muestra los errores de los campos obligatorios y no llama al backend', async () => {
    await renderForm();
    await userEvent.click(screen.getByRole('button', { name: /confirmar rutina/i }));

    expect(await screen.findByText('Selecciona un conductor')).toBeInTheDocument();
    expect(screen.getByText('Selecciona un vehículo')).toBeInTheDocument();
    expect(screen.getByText(/Define el origen/)).toBeInTheDocument();
    expect(screen.getByText('Selecciona al menos un día de operación')).toBeInTheDocument();
    expect(apiService.createSchedule).not.toHaveBeenCalled();
    expect(apiService.createRoute).not.toHaveBeenCalled();
  });

  it('viaje recurrente: crea el cronograma con los días y la hora elegidos', async () => {
    apiService.createSchedule.mockResolvedValue({});
    const { onSuccess } = await renderForm();
    await pickBasics();
    await userEvent.click(screen.getByRole('button', { name: 'Lun' }));
    await userEvent.click(screen.getByRole('button', { name: /confirmar rutina/i }));

    await waitFor(() => expect(apiService.createSchedule).toHaveBeenCalledTimes(1));
    expect(apiService.createSchedule.mock.calls[0][0]).toMatchObject({
      vehicle_id: 'v1',
      driver_id: 'd1',
      origin: 'La Paz',
      destination: 'Oruro',
      origin_lat: -16.5,
      dest_lng: -67.15,
      day_times: { 1: '08:30' },
    });
    expect(apiService.createRoute).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalled();
  });

  it('viaje único: crea la ruta con la salida en ISO 8601 y sin campos de cronograma', async () => {
    apiService.createRoute.mockResolvedValue({});
    await renderForm();
    await pickBasics();
    await userEvent.click(screen.getByRole('button', { name: /viaje único/i }));
    fireEvent.change(screen.getByLabelText(/fecha y hora de salida/i), { target: { value: inDays(2) } });
    await userEvent.click(screen.getByRole('button', { name: /confirmar viaje/i }));

    await waitFor(() => expect(apiService.createRoute).toHaveBeenCalledTimes(1));
    const payload = apiService.createRoute.mock.calls[0][0];
    expect(payload).toMatchObject({ driver_id: 'd1', vehicle_id: 'v1', origin: 'La Paz', destination: 'Oruro', checkpoints: [] });
    expect(payload.departure_time).toMatch(/Z$/);
    expect('trip_type' in payload).toBe(false);
    expect('day_times' in payload).toBe(false);
    expect(apiService.createSchedule).not.toHaveBeenCalled();
  });

  it('viaje único: rechaza una salida en el pasado', async () => {
    await renderForm();
    await pickBasics();
    await userEvent.click(screen.getByRole('button', { name: /viaje único/i }));
    fireEvent.change(screen.getByLabelText(/fecha y hora de salida/i), { target: { value: inDays(-2) } });
    await userEvent.click(screen.getByRole('button', { name: /confirmar viaje/i }));

    expect(await screen.findByText('La fecha de salida no puede estar en el pasado')).toBeInTheDocument();
    expect(apiService.createRoute).not.toHaveBeenCalled();
  });

  it('exige nombre y coordenadas en cada checkpoint manual', async () => {
    await renderForm();
    await pickBasics();
    await userEvent.click(screen.getByRole('button', { name: /viaje único/i }));
    fireEvent.change(screen.getByLabelText(/fecha y hora de salida/i), { target: { value: inDays(2) } });
    await userEvent.click(screen.getByRole('button', { name: /\+ agregar parada/i }));
    await userEvent.click(screen.getByRole('button', { name: /confirmar viaje/i }));

    expect(await screen.findByText('El nombre del punto es requerido')).toBeInTheDocument();
    expect(apiService.createRoute).not.toHaveBeenCalled();
  });

  it('al editar actualiza la ruta existente (antes creaba un cronograma por error)', async () => {
    apiService.updateRoute.mockResolvedValue({});
    const initialData = {
      id: 'r9',
      origin: 'La Paz',
      destination: 'Oruro',
      driver_id: 'd1',
      vehicle_id: 'v1',
      origin_lat: -16.5,
      origin_lng: -68.15,
      dest_lat: -17.98,
      dest_lng: -67.15,
      departure_time: new Date(Date.now() + 2 * 86400000).toISOString(),
      checkpoints: [],
    };
    const { onSuccess } = await renderForm({ initialData });
    await userEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() => expect(apiService.updateRoute).toHaveBeenCalledTimes(1));
    expect(apiService.updateRoute.mock.calls[0][0]).toBe('r9');
    expect(apiService.createSchedule).not.toHaveBeenCalled();
    expect(apiService.createRoute).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalled();
  });
});
