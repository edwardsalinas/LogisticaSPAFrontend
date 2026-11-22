import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PackageForm from './PackageForm';
import apiService from '../../../services/apiService';

vi.mock('../../../services/apiService', () => ({
  default: {
    getPredefinedRoutes: vi.fn(),
    getRoutes: vi.fn(),
    getClients: vi.fn(),
    post: vi.fn(),
  },
}));

const ROUTES = [{ id: 'r1', route_code: 'RT-1', origin: 'La Paz', destination: 'Oruro', departure_time: '2026-03-20T10:00:00Z' }];

beforeEach(() => {
  apiService.getPredefinedRoutes.mockResolvedValue({ data: [] });
  apiService.getRoutes.mockResolvedValue({ data: ROUTES });
  apiService.getClients.mockResolvedValue({ data: [] });
  apiService.post.mockReset();
});

const submit = () => userEvent.click(screen.getByRole('button', { name: /registrar paquete/i }));

describe('PackageForm (React Hook Form + Zod)', () => {
  it('muestra los errores de cada campo y no envía el formulario vacío', async () => {
    render(<PackageForm onSuccess={vi.fn()} onCancel={vi.fn()} />);
    await submit();

    expect(await screen.findByText('Selecciona el origen')).toBeInTheDocument();
    expect(screen.getByText('Selecciona el destino')).toBeInTheDocument();
    expect(screen.getByText(/nombre del destinatario es requerido/i)).toBeInTheDocument();
    expect(screen.getByText('El peso debe ser un número positivo')).toBeInTheDocument();
    expect(screen.getByText('Selecciona un cliente registrado')).toBeInTheDocument();
    expect(apiService.post).not.toHaveBeenCalled();
  });

  it('con remitente invitado exige su nombre', async () => {
    render(<PackageForm onSuccess={vi.fn()} onCancel={vi.fn()} />);
    await userEvent.click(screen.getByLabelText(/modo invitado/i));
    await submit();
    expect(await screen.findByText('Ingresa el nombre del remitente')).toBeInTheDocument();
  });

  it('registra el paquete enviando el peso como número y los campos que espera la API', async () => {
    apiService.post.mockResolvedValue({ success: true });
    const onSuccess = vi.fn();
    render(<PackageForm onSuccess={onSuccess} onCancel={vi.fn()} />);

    await screen.findByRole('option', { name: 'La Paz' });
    await userEvent.selectOptions(screen.getByLabelText(/^origen/i), 'La Paz');
    await userEvent.selectOptions(screen.getByLabelText(/^destino/i), 'Oruro');
    await userEvent.click(screen.getByLabelText(/modo invitado/i));
    await userEvent.type(screen.getByLabelText(/nombre de quien envía/i), 'Juan Perez');
    await userEvent.type(screen.getByLabelText(/nombre de quien recibe/i), 'Maria Lopez');
    await userEvent.type(screen.getByLabelText(/peso/i), '15.5');
    await submit();

    await waitFor(() => expect(apiService.post).toHaveBeenCalledTimes(1));
    const [url, payload] = apiService.post.mock.calls[0];
    expect(url).toBe('/logistics/packages');
    expect(payload).toMatchObject({
      origen: 'La Paz',
      destino: 'Oruro',
      peso: 15.5,
      recipient_name: 'Maria Lopez',
      sender_name: 'Juan Perez',
      sender_id: null,
      route_id: null,
    });
    expect('is_guest' in payload).toBe(false);
    expect(onSuccess).toHaveBeenCalled();
  });

  it('muestra el error del servidor sin cerrar el formulario', async () => {
    apiService.post.mockRejectedValue(new Error('Error al registrar paquete'));
    const onSuccess = vi.fn();
    render(<PackageForm onSuccess={onSuccess} onCancel={vi.fn()} />);

    await screen.findByRole('option', { name: 'La Paz' });
    await userEvent.selectOptions(screen.getByLabelText(/^origen/i), 'La Paz');
    await userEvent.selectOptions(screen.getByLabelText(/^destino/i), 'Oruro');
    await userEvent.click(screen.getByLabelText(/modo invitado/i));
    await userEvent.type(screen.getByLabelText(/nombre de quien envía/i), 'Juan Perez');
    await userEvent.type(screen.getByLabelText(/nombre de quien recibe/i), 'Maria Lopez');
    await userEvent.type(screen.getByLabelText(/peso/i), '3');
    await submit();

    expect(await screen.findByText('Error al registrar paquete')).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
