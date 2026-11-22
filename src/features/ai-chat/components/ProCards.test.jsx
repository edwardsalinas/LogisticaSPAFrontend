import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActionProposalCard, AttachmentCard } from './AssistantCards';
import { suggestionsForRole } from '../suggestions';
import apiService from '../../../services/apiService';

vi.mock('../../../services/apiService', () => ({ default: { post: vi.fn() } }));

const BATCH = {
  kind: 'action_proposal',
  action: { id: '22222222-2222-4222-8222-222222222222', type: 'deliver_package', title: 'Confirmar entrega de 3 paquetes', lines: ['Paquetes (3): TRK-1, TRK-2, TRK-3', 'Pasarán a: Entregado', 'Se omiten 1: TRK-9 (ya fue entregado)'] },
};

describe('Acciones en lote: resultado por paquete', () => {
  beforeEach(() => apiService.post.mockReset());

  it('muestra qué se hizo y qué no con cada paquete, y el motivo de lo que falló', async () => {
    apiService.post.mockResolvedValue({
      success: true,
      result: {
        message: 'Entregados 2 de 3 paquetes. No se pudo con: TRK-2 (Este paquete no pertenece a una de tus rutas).',
        data: { results: [{ tracking_code: 'TRK-1', ok: true }, { tracking_code: 'TRK-2', ok: false, error: 'Este paquete no pertenece a una de tus rutas' }, { tracking_code: 'TRK-3', ok: true }] },
      },
    });
    render(<MemoryRouter><ActionProposalCard data={BATCH} /></MemoryRouter>);
    expect(screen.getByText('Se omiten 1: TRK-9 (ya fue entregado)')).toBeInTheDocument(); // lo omitido se ve ANTES de confirmar
    await userEvent.click(screen.getByRole('button', { name: /^confirmar$/i }));

    const list = await screen.findByRole('list', { name: /resultado por paquete/i });
    expect(list).toHaveTextContent('✓ TRK-1');
    expect(list).toHaveTextContent('✗ TRK-2 — Este paquete no pertenece a una de tus rutas');
    expect(list).toHaveTextContent('✓ TRK-3');
    expect(screen.getByText(/entregados 2 de 3 paquetes/i)).toBeInTheDocument();
  });

  it('con un solo paquete no se añade la lista de resultados', async () => {
    apiService.post.mockResolvedValue({ result: { message: 'Paquete TRK-1 marcado como entregado.', data: { results: [{ tracking_code: 'TRK-1', ok: true }] } } });
    render(<MemoryRouter><ActionProposalCard data={BATCH} /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: /^confirmar$/i }));
    expect(await screen.findByText(/marcado como entregado/i)).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: /resultado por paquete/i })).not.toBeInTheDocument();
  });
});

describe('Tarjeta: resumen del día', () => {
  const data = {
    kind: 'daily_briefing', date: '2026-11-22',
    kpis: { in_transit: 2, pending: 3, delayed: 1, incidents: 1 },
    priorities: ['Atender 1 paquete con siniestro', 'Revisar 1 paquete retrasado (su ruta ya debió salir)'],
    attention: [{ tracking_code: 'TRK-S', route: 'La Paz → Oruro', reason: 'siniestro' }],
    unassigned: { count: 2, oldest: [{ tracking_code: 'TRK-P', route: 'Oruro → La Paz', peso: 8 }] },
    departures_today: [{ origin: 'La Paz', destination: 'Oruro', departure_time: '2026-11-22T14:00:00Z' }],
  };

  it('muestra las prioridades en orden, lo que requiere atención y los pendientes sin viaje', async () => {
    const onAsk = vi.fn();
    render(<MemoryRouter><AttachmentCard attachment={data} onAsk={onAsk} role="admin" /></MemoryRouter>);
    const items = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(items[0]).toContain('Atender 1 paquete con siniestro');
    expect(items[1]).toContain('Revisar 1 paquete retrasado');
    expect(screen.getByText(/paquetes pendientes sin viaje/i)).toHaveTextContent('2 paquetes pendientes sin viaje'); // el número va en negrita aparte
    expect(screen.getByText(/salen hoy/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /TRK-S/ }));
    expect(onAsk).toHaveBeenCalledWith('¿Dónde está el paquete TRK-S?');
  });
});

describe('Tarjeta: analítica del período', () => {
  it('muestra envíos, variación, a tiempo, conductores y días de más movimiento; sin dato usa un guion', () => {
    render(<MemoryRouter><AttachmentCard role="admin" attachment={{
      kind: 'analytics_summary', range: { from: '2026-10-23', to: '2026-11-21', days: 30 },
      totals: { shipments: 12, change: 20, onTimePct: 90.5, avgDeliveryHours: 0.5 },
      top_drivers: [{ name: 'Juan Pérez', deliveries: 5, efficiency_pct: 80 }], busiest_days: [{ date: '20 nov', packages: 4 }],
    }} /></MemoryRouter>);
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('+20%')).toBeInTheDocument();
    expect(screen.getByText('90.5%')).toBeInTheDocument();
    expect(screen.getByText('30 min')).toBeInTheDocument();
    expect(screen.getByText(/Juan Pérez · 5 entregas · 80% a tiempo/)).toBeInTheDocument();
    expect(screen.getByText('20 nov: 4')).toBeInTheDocument();
  });

  it('sin datos del período no inventa cifras', () => {
    render(<MemoryRouter><AttachmentCard role="admin" attachment={{ kind: 'analytics_summary', range: { from: 'a', to: 'b', days: 1 }, totals: { shipments: 0, change: null, onTimePct: null, avgDeliveryHours: null }, top_drivers: [], busiest_days: [] }} /></MemoryRouter>);
    expect(screen.getAllByText('—').length).toBe(3);
  });
});

describe('Preguntas sugeridas para el personal', () => {
  it('incluyen el resumen del día, el balance del mes y entregar varios', () => {
    const labels = suggestionsForRole('admin').map((s) => s.label);
    expect(labels).toEqual(expect.arrayContaining(['Resumen del día', 'Balance del mes', 'Entregar varios']));
    expect(suggestionsForRole('client').map((s) => s.label)).not.toContain('Resumen del día'); // eso es del personal
  });
});
