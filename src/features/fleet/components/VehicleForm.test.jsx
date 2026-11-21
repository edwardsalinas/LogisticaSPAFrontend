import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VehicleForm from './VehicleForm';
import apiService from '../../../services/apiService';

vi.mock('../../../services/apiService', () => ({
  default: { createVehicle: vi.fn() },
}));

const renderForm = () => {
  const onSuccess = vi.fn();
  const onCancel = vi.fn();
  render(<VehicleForm onSuccess={onSuccess} onCancel={onCancel} />);
  return { onSuccess, onCancel };
};

const submit = () => userEvent.click(screen.getByRole('button', { name: /crear vehículo/i }));

describe('VehicleForm (conectado al backend)', () => {
  beforeEach(() => apiService.createVehicle.mockReset());

  it('valida los campos y no llama al backend si hay errores', async () => {
    renderForm();
    await submit();

    expect(await screen.findByText('La placa debe tener al menos 6 caracteres')).toBeInTheDocument();
    expect(screen.getByText('El modelo es requerido')).toBeInTheDocument();
    expect(screen.getByText('La capacidad debe ser positiva')).toBeInTheDocument();
    expect(apiService.createVehicle).not.toHaveBeenCalled();
  });

  it('envía los datos al backend con la forma que espera la API (antes solo simulaba el guardado)', async () => {
    apiService.createVehicle.mockResolvedValue({ success: true });
    const { onSuccess } = renderForm();

    await userEvent.type(screen.getByLabelText(/^placa/i), 'abc-123');
    await userEvent.type(screen.getByLabelText(/^modelo/i), 'FH16');
    await userEvent.type(screen.getByLabelText(/capacidad/i), '20000');
    await submit();

    await waitFor(() => expect(apiService.createVehicle).toHaveBeenCalledTimes(1));
    expect(apiService.createVehicle).toHaveBeenCalledWith({
      plate: 'ABC-123',
      model: 'FH16',
      type: 'camion',
      capacity_kg: 20000,
      status: 'disponible',
    });
    expect(onSuccess).toHaveBeenCalled();
  });

  it('incluye la marca solo cuando se indica', async () => {
    apiService.createVehicle.mockResolvedValue({ success: true });
    renderForm();
    await userEvent.type(screen.getByLabelText(/^placa/i), 'XYZ-789');
    await userEvent.type(screen.getByLabelText(/marca/i), 'Volvo');
    await userEvent.type(screen.getByLabelText(/^modelo/i), 'FH16');
    await userEvent.type(screen.getByLabelText(/capacidad/i), '1500');
    await submit();

    await waitFor(() => expect(apiService.createVehicle).toHaveBeenCalled());
    expect(apiService.createVehicle.mock.calls[0][0]).toMatchObject({ brand: 'Volvo', plate: 'XYZ-789' });
  });

  it('muestra el error de validación que devuelve el backend y no cierra el formulario', async () => {
    // Función simple en vez de vi.fn(): el espía de Vitest reporta como "no manejado" el rechazo que el
    // componente sí captura, lo que haría fallar la prueba aunque el comportamiento sea correcto.
    const spy = apiService.createVehicle;
    apiService.createVehicle = async () => {
      throw Object.assign(new Error('Bad Request'), { status: 400, data: { errors: { plate: ['Placa duplicada'] } } });
    };
    try {
      const { onSuccess } = renderForm();
      await userEvent.type(screen.getByLabelText(/^placa/i), 'ABC-123');
      await userEvent.type(screen.getByLabelText(/^modelo/i), 'FH16');
      await userEvent.type(screen.getByLabelText(/capacidad/i), '100');
      await submit();

      await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Placa duplicada'));
      expect(onSuccess).not.toHaveBeenCalled();
    } finally {
      apiService.createVehicle = spy;
    }
  });
});
