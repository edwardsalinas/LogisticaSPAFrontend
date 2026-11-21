import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AnalyticsPage, { toYmd } from './AnalyticsPage';
import { formatDuration } from '../components/AnalyticsHero';
import apiService from '../../../services/apiService';

// Los gráficos (recharts) necesitan medidas reales del navegador; aquí se verifican los datos, no el dibujo
vi.mock('../components/TrendChart', () => ({ default: ({ total, change }) => <div data-testid="trend">total={total};cambio={String(change)}</div> }));
vi.mock('../components/DelayReasonsChart', () => ({ default: ({ data }) => <div data-testid="status">{data.map((d) => `${d.name}:${d.value}`).join(',')}</div> }));
vi.mock('../../../components/molecules/DateRangePicker', () => ({ default: () => <div data-testid="range" /> }));
vi.mock('../../../services/apiService', () => ({ default: { getAnalytics: vi.fn() } }));

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><AnalyticsPage /></QueryClientProvider>);
};

const RESPONSE = {
  data: {
    totals: { shipments: 7, change: 40, delivered: 4, onTimePct: 75, avgDeliveryHours: 5.5, incidents: 1 },
    trend: [{ date: '1 nov', actual: 3, previous: 1 }],
    statusBreakdown: [{ name: 'Entregado', value: 4, color: '#10b981' }],
    drivers: [{ id: 'd1', name: 'Ana Gómez', deliveries: 4, onTime: 3, efficiency: 75 }],
  },
};

describe('Analítica con datos reales', () => {
  beforeEach(() => vi.clearAllMocks());

  it('consulta la API con el rango en formato AAAA-MM-DD y muestra las cifras que devuelve', async () => {
    apiService.getAnalytics.mockResolvedValue(RESPONSE);
    renderPage();

    expect(await screen.findByText('Ana Gómez')).toBeInTheDocument();
    const { from, to } = apiService.getAnalytics.mock.calls[0][0];
    expect(from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(screen.getAllByText('75%').length).toBeGreaterThanOrEqual(2); // a tiempo (resumen) y eficiencia del conductor
    expect(screen.getByText('5.5 h')).toBeInTheDocument(); // entrega promedio
    expect(screen.getByTestId('trend')).toHaveTextContent('total=7;cambio=40');
    expect(screen.getByTestId('status')).toHaveTextContent('Entregado:4');
  });

  it('ya no muestra cifras ni conductores inventados', async () => {
    apiService.getAnalytics.mockResolvedValue({ data: { totals: { shipments: 0, change: null, delivered: 0, onTimePct: null, avgDeliveryHours: null, incidents: 0 }, trend: [], statusBreakdown: [], drivers: [] } });
    renderPage();

    expect(await screen.findByText(/aun no hay entregas con conductor/i)).toBeInTheDocument();
    for (const fake of ['12,482', '94.2%', 'Juan Perez', 'Carlos Ruiz', 'Maria Lopez']) {
      expect(screen.queryByText(fake)).not.toBeInTheDocument();
    }
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2); // a tiempo y entrega promedio: sin dato, no 0
  });

  it('muestra un aviso si la API falla', async () => {
    apiService.getAnalytics.mockRejectedValue(new Error('Rango máximo de 92 días'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(/92 días/);
  });

  it('toYmd formatea la fecha local con ceros', () => {
    expect(toYmd(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('formatDuration: minutos si es menos de una hora, horas si no, guion sin dato', () => {
    expect(formatDuration(0.05)).toBe('3 min');
    expect(formatDuration(5.5)).toBe('5.5 h');
    expect(formatDuration(null)).toBe('—');
  });
});
