import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TrackingForm from './TrackingForm';
import apiService from '../../../services/apiService';

vi.mock('../../../services/apiService', () => ({
  default: { createTrackingEvent: vi.fn() },
}));

const PACKAGES = [{ id: 'p1', tracking_code: 'TRK-1', origen: 'La Paz', destino: 'Oruro' }];

describe('TrackingForm (React Hook Form + Zod)', () => {
  beforeEach(() => apiService.createTrackingEvent.mockReset());

  it('valida los campos obligatorios y el rango de las coordenadas', async () => {
    render(<TrackingForm packages={PACKAGES} onSuccess={vi.fn()} onCancel={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /guardar evento/i }));
    expect(await screen.findByText('Selecciona un paquete')).toBeInTheDocument();
    expect(screen.getByText('Selecciona el estado')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/latitud/i), '120');
    await userEvent.type(screen.getByLabelText(/longitud/i), '-68');
    await userEvent.click(screen.getByRole('button', { name: /guardar evento/i }));
    expect(await screen.findByText('La latitud debe estar entre -90 y 90')).toBeInTheDocument();
    expect(apiService.createTrackingEvent).not.toHaveBeenCalled();
  });

  it('registra el evento por POST /tracking con el estado del backend y coordenadas numéricas', async () => {
    apiService.createTrackingEvent.mockResolvedValue({});
    const onSuccess = vi.fn();
    render(<TrackingForm packages={PACKAGES} onSuccess={onSuccess} onCancel={vi.fn()} />);

    await userEvent.selectOptions(screen.getByLabelText(/^paquete/i), 'p1');
    await userEvent.selectOptions(screen.getByLabelText(/^estado/i), 'en_transito');
    await userEvent.type(screen.getByLabelText(/latitud/i), '-16.4897');
    await userEvent.type(screen.getByLabelText(/longitud/i), '-68.1193');
    await userEvent.click(screen.getByRole('button', { name: /guardar evento/i }));

    await waitFor(() => expect(apiService.createTrackingEvent).toHaveBeenCalledTimes(1));
    expect(apiService.createTrackingEvent).toHaveBeenCalledWith({
      package_id: 'p1',
      status: 'en_transito',
      lat: -16.4897,
      lng: -68.1193,
    });
    expect(onSuccess).toHaveBeenCalled();
  });
});
