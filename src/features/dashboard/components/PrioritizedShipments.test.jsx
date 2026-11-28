import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../hooks/queries/usePackages', () => ({ usePackages: () => ({ data: [], isLoading: false }) }));

import PrioritizedShipments, { prioritize } from './PrioritizedShipments';

describe('Despachos prioritarios', () => {
  it('"Ver operación completa" es un enlace a Paquetes, con objetivo táctil de 44 px', () => {
    render(<MemoryRouter><PrioritizedShipments /></MemoryRouter>);
    const link = screen.getByRole('link', { name: /ver operación completa/i });
    expect(link).toHaveAttribute('href', '/logistics/packages');
    expect(link.className).toContain('min-h-11');
  });
});

describe('prioridad de los despachos del tablero', () => {
  const NOW = Date.parse('2026-11-28T16:00:00Z');
  const pkg = (id, status, extra = {}) => ({ id, tracking_code: `TRK-${id}`, origen: 'La Paz', destino: 'Oruro', recipient_name: `Dest ${id}`, status, route_id: null, ...extra });
  const past = { route_id: 'r1', transport_routes: { departure_time: '2026-11-28T10:00:00Z' } };
  const future = { route_id: 'r2', transport_routes: { departure_time: '2026-11-30T10:00:00Z' } };

  it('primero lo urgente (siniestro, retrasado, sin viaje) aunque sea más antiguo que lo nuevo', () => {
    // la lista viene del más nuevo al más antiguo
    const list = [pkg('n1', 'en_transito'), pkg('n2', 'asignado', future), pkg('v1', 'asignado', past), pkg('v2', 'pendiente'), pkg('v3', 'siniestro')];
    const { rows } = prioritize(list, NOW);
    expect(rows.map((r) => r.id)).toEqual(['v3', 'v1', 'v2', 'n1', 'n2']);
    expect(rows[0].reason).toMatch(/Siniestro/);
    expect(rows[1].reason).toMatch(/Retrasado/);
    expect(rows[2].reason).toMatch(/Sin viaje/);
  });

  it('no ocupan lugar los entregados, cancelados ni devueltos; y a igual urgencia, el más reciente primero', () => {
    const { rows, total } = prioritize([pkg('e', 'entregado'), pkg('c', 'cancelado'), pkg('d', 'devuelto'), pkg('a', 'pendiente'), pkg('b', 'pendiente')], NOW);
    expect(rows.map((r) => r.id)).toEqual(['a', 'b']);
    expect(total).toBe(2);
  });

  it('muestra como máximo 5 y dice cuántos piden atención en total', () => {
    const list = Array.from({ length: 8 }, (_, i) => pkg(`p${i}`, 'pendiente'));
    const { rows, total } = prioritize(list, NOW);
    expect(rows).toHaveLength(5);
    expect(total).toBe(8);
  });

  it('un estado desconocido no rompe: queda al final como pendiente', () => {
    const { rows } = prioritize([pkg('x', 'raro'), pkg('s', 'siniestro')], NOW);
    expect(rows.map((r) => r.id)).toEqual(['s', 'x']);
  });
});

describe('el tablero muestra el código del paquete, no un fragmento del identificador interno', () => {
  it('cada fila trae el código TRK, el destinatario y un enlace a su ficha', async () => {
    vi.resetModules();
    vi.doMock('../../../hooks/queries/usePackages', () => ({ usePackages: () => ({ isLoading: false, data: [{ id: '833d3446-aaaa-bbbb-cccc-111122223333', tracking_code: 'TRK-999-ABCD', origen: 'La Paz', destino: 'Oruro', recipient_name: 'Jorge López', status: 'pendiente', route_id: null }] }) }));
    const { default: Fresh } = await import('./PrioritizedShipments');
    render(<MemoryRouter><Fresh /></MemoryRouter>);
    const link = screen.getByRole('link', { name: 'TRK-999-ABCD' });
    expect(link).toHaveAttribute('href', '/logistics/packages/833d3446-aaaa-bbbb-cccc-111122223333');
    expect(screen.getByText('Jorge López')).toBeInTheDocument();
    expect(screen.queryByText('833D3446')).toBeNull();            // el fragmento del UUID ya no se muestra
    expect(screen.queryByText(/Unidad Logística/)).toBeNull();    // ni el operador inventado
    expect(screen.getByText('Sin viaje')).toBeInTheDocument();
  });
});
