import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DriverDashboardPage from './DriverDashboardPage';
import apiService from '../../../services/apiService';

vi.mock('@fullcalendar/react', () => ({ default: () => <div data-testid="calendar" /> }));
vi.mock('react-leaflet', () => ({ Marker: () => null, Popup: () => null, Polyline: () => null }));
vi.mock('../../../components/molecules/BaseMap', () => ({ default: ({ children }) => <div data-testid="map">{children}</div> }));
vi.mock('../../../components/molecules/RoutePath', () => ({ default: () => null }));
vi.mock('../../../components/molecules/CheckpointMarker', () => ({ default: () => null }));
vi.mock('../../../components/molecules/OriginDestMarker', () => ({ default: () => null }));
vi.mock('../../../components/molecules/VehicleMarker', () => ({ default: () => null }));

vi.mock('../../../services/apiService', () => ({
  default: {
    getActiveTrip: vi.fn(),
    getRoutes: vi.fn(),
    getRoute: vi.fn(),
    logTripEvent: vi.fn(),
    logTripEventsBatch: vi.fn(),
    deliverPackage: vi.fn(),
  },
}));

const ROUTE = {
  id: 'r1', route_code: 'RT-1', origin: 'La Paz', destination: 'Oruro', status: 'en_transito',
  checkpoints: [], packages: [{ id: 'p1', tracking_code: 'TRK-AAA', destino: 'Oruro', status: 'en_transito' }],
};

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter><DriverDashboardPage /></BrowserRouter>
    </QueryClientProvider>
  );
};

describe('HU02: confirmar la entrega con nota opcional', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiService.getActiveTrip.mockResolvedValue({ data: { id: 't1', route_id: 'r1', status: 'active', events: [] } });
    apiService.getRoutes.mockResolvedValue({ data: [ROUTE] });
    apiService.getRoute.mockResolvedValue({ data: ROUTE });
  });

  it('abre la confirmación, envía la nota y marca el paquete como entregado', async () => {
    apiService.deliverPackage.mockResolvedValue({ data: {} });
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: /^entregar$/i }));
    await userEvent.type(screen.getByLabelText(/nota de entrega/i), 'Recibió la señora Mamani');
    await userEvent.click(screen.getByRole('button', { name: /confirmar entrega/i }));

    await waitFor(() => expect(apiService.deliverPackage).toHaveBeenCalledWith('p1', 'Recibió la señora Mamani'));
    expect(await screen.findByText(/éxito/i)).toBeInTheDocument();
  });

  it('la nota es opcional', async () => {
    apiService.deliverPackage.mockResolvedValue({ data: {} });
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /^entregar$/i }));
    await userEvent.click(screen.getByRole('button', { name: /confirmar entrega/i }));
    await waitFor(() => expect(apiService.deliverPackage).toHaveBeenCalledWith('p1', ''));
  });

  it('si el servidor rechaza la entrega (paquete de otra ruta) muestra el motivo y no la marca', async () => {
    apiService.deliverPackage.mockRejectedValue({ response: { data: { message: 'Este paquete no pertenece a una de tus rutas' } } });
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /^entregar$/i }));
    await userEvent.click(screen.getByRole('button', { name: /confirmar entrega/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/no pertenece a una de tus rutas/i);
    expect(screen.queryByText(/éxito/i)).not.toBeInTheDocument();
  });

  it('cancelar cierra la confirmación sin enviar nada', async () => {
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /^entregar$/i }));
    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(screen.queryByLabelText(/nota de entrega/i)).not.toBeInTheDocument();
    expect(apiService.deliverPackage).not.toHaveBeenCalled();
  });
});
