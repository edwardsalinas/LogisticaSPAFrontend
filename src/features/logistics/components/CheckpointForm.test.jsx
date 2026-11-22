import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CheckpointForm from './CheckpointForm';
import apiService from '../../../services/apiService';

vi.mock('../../../services/apiService', () => ({
  default: { createCheckpoint: vi.fn(), updateCheckpoint: vi.fn() },
}));

describe('CheckpointForm (React Hook Form + Zod)', () => {
  beforeEach(() => {
    apiService.createCheckpoint.mockReset();
    apiService.updateCheckpoint.mockReset();
  });

  it('rechaza coordenadas fuera de rango sin llamar al backend', async () => {
    render(<CheckpointForm routeId="r1" onSuccess={vi.fn()} onCancel={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/nombre del punto de control/i), 'Terminal');
    await userEvent.type(screen.getByLabelText(/latitud/i), '95');
    await userEvent.type(screen.getByLabelText(/longitud/i), '-200');
    await userEvent.click(screen.getByRole('button', { name: /crear punto de control/i }));

    expect(await screen.findByText('La latitud debe estar entre -90 y 90')).toBeInTheDocument();
    expect(screen.getByText('La longitud debe estar entre -180 y 180')).toBeInTheDocument();
    expect(apiService.createCheckpoint).not.toHaveBeenCalled();
  });

  it('crea el checkpoint enviando números (no texto) al backend', async () => {
    apiService.createCheckpoint.mockResolvedValue({});
    const onSuccess = vi.fn();
    render(<CheckpointForm routeId="r1" onSuccess={onSuccess} onCancel={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/nombre del punto de control/i), 'Terminal La Paz');
    await userEvent.type(screen.getByLabelText(/latitud/i), '-16.5');
    await userEvent.type(screen.getByLabelText(/longitud/i), '-68.1193');
    await userEvent.click(screen.getByRole('button', { name: /crear punto de control/i }));

    await waitFor(() => expect(apiService.createCheckpoint).toHaveBeenCalledTimes(1));
    expect(apiService.createCheckpoint).toHaveBeenCalledWith('r1', {
      name: 'Terminal La Paz',
      lat: -16.5,
      lng: -68.1193,
      radius_meters: 100,
      sequence_order: 1,
    });
    expect(onSuccess).toHaveBeenCalled();
  });

  it('al editar usa updateCheckpoint con el id del checkpoint', async () => {
    apiService.updateCheckpoint.mockResolvedValue({});
    const checkpoint = { id: 'c9', name: 'Puesto Viacha', lat: -16.65, lng: -68.31, radius_meters: 150, sequence_order: 3 };
    render(<CheckpointForm routeId="r1" checkpoint={checkpoint} onSuccess={vi.fn()} onCancel={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() => expect(apiService.updateCheckpoint).toHaveBeenCalled());
    expect(apiService.updateCheckpoint).toHaveBeenCalledWith('r1', 'c9', {
      name: 'Puesto Viacha', lat: -16.65, lng: -68.31, radius_meters: 150, sequence_order: 3,
    });
  });

  it('se puede crear eligiendo solo una ciudad: el nombre y la posición se ponen solos', async () => {
    apiService.createCheckpoint.mockResolvedValue({});
    render(<CheckpointForm routeId="r1" nextOrder={4} onSuccess={vi.fn()} onCancel={vi.fn()} />);
    await userEvent.selectOptions(screen.getByLabelText(/^ciudad/i), 'oruro');
    expect(screen.getByLabelText(/nombre del punto de control/i)).toHaveValue('Oruro');
    await userEvent.click(screen.getByRole('button', { name: /crear punto de control/i }));

    await waitFor(() => expect(apiService.createCheckpoint).toHaveBeenCalledTimes(1));
    expect(apiService.createCheckpoint).toHaveBeenCalledWith('r1', {
      name: 'Oruro', lat: -17.9647, lng: -67.1061, radius_meters: 100, sequence_order: 4,
    });
  });

  it('no pisa un nombre que el usuario ya escribió', async () => {
    render(<CheckpointForm routeId="r1" onSuccess={vi.fn()} onCancel={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/nombre del punto de control/i), 'Peaje de Patacamaya');
    await userEvent.selectOptions(screen.getByLabelText(/^ciudad/i), 'patacamaya');
    expect(screen.getByLabelText(/nombre del punto de control/i)).toHaveValue('Peaje de Patacamaya');
  });

  it('sin ubicación pide elegirla; fuera de Bolivia lo rechaza', async () => {
    render(<CheckpointForm routeId="r1" onSuccess={vi.fn()} onCancel={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/nombre del punto de control/i), 'Punto');
    await userEvent.click(screen.getByRole('button', { name: /crear punto de control/i }));
    expect((await screen.findAllByText(/elige una ubicación/i)).length).toBeGreaterThan(0);

    await userEvent.type(screen.getByLabelText(/latitud/i), '40.4');
    await userEvent.type(screen.getByLabelText(/longitud/i), '-3.7');
    await userEvent.click(screen.getByRole('button', { name: /crear punto de control/i }));
    expect(await screen.findByText(/queda fuera de bolivia/i)).toBeInTheDocument();
    expect(apiService.createCheckpoint).not.toHaveBeenCalled();
  });

  it('el radio y la posición están en "Opciones avanzadas", con explicación', () => {
    render(<CheckpointForm routeId="r1" onSuccess={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText(/opciones avanzadas/i)).toBeInTheDocument();
    expect(screen.getByText(/se considera que el vehículo llegó/i)).toBeInTheDocument();
  });
});
