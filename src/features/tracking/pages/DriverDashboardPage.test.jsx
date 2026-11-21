import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DriverDashboardPage from './DriverDashboardPage';

// Dependencias pesadas (mapa y calendario) se sustituyen: la prueba verifica el panel, no Leaflet ni FullCalendar
vi.mock('@fullcalendar/react', () => ({ default: () => <div data-testid="calendar" /> }));
vi.mock('react-leaflet', () => ({ Marker: () => null, Popup: () => null, Polyline: () => null }));
vi.mock('../../../components/molecules/BaseMap', () => ({ default: ({ children }) => <div data-testid="map">{children}</div> }));
vi.mock('../../../components/molecules/RoutePath', () => ({ default: () => null }));
vi.mock('../../../components/molecules/CheckpointMarker', () => ({ default: () => null }));
vi.mock('../../../components/molecules/OriginDestMarker', () => ({ default: () => null }));
vi.mock('../../../components/molecules/VehicleMarker', () => ({ default: () => null }));

vi.mock('../../../services/apiService', () => ({
  default: {
    getActiveTrip: vi.fn().mockResolvedValue({ data: null }),
    getRoutes: vi.fn().mockResolvedValue({ data: [] }),
    getRoute: vi.fn().mockResolvedValue({ data: null }),
    logTripEvent: vi.fn(),
    logTripEventsBatch: vi.fn(),
  },
}));

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <DriverDashboardPage />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('DriverDashboardPage', () => {
  const onLine = Object.getOwnPropertyDescriptor(Navigator.prototype, 'onLine');

  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  afterEach(() => {
    delete navigator.onLine;
    if (onLine) Object.defineProperty(Navigator.prototype, 'onLine', onLine);
  });

  it('carga y muestra el itinerario de viajes', async () => {
    renderPage();
    expect(await screen.findByText(/Itinerario de Viajes/i)).toBeInTheDocument();
  });

  it('avisa al conductor cuando se pierde la conexión (modo offline)', async () => {
    renderPage();
    await screen.findByText(/Itinerario de Viajes/i);
    expect(screen.queryByText(/Sin conexión/i)).not.toBeInTheDocument();

    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    await act(async () => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(await screen.findByText(/Sin conexión/i)).toBeInTheDocument();
    expect(screen.getByText(/Se enviarán automáticamente/i)).toBeInTheDocument();
  });
});
