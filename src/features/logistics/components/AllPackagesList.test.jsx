import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AllPackagesList from './AllPackagesList';

const pkg = (id, o = {}) => ({ id, tracking_code: `TRK-${id}`, origen: 'La Paz', destino: 'Oruro', recipient_name: `Dest ${id}`, status: 'pendiente', peso: 3, created_at: '2026-11-28T12:00:00Z', route_id: null, ...o });
const view = (props) => render(<MemoryRouter><AllPackagesList {...props} /></MemoryRouter>);

describe('lista «Todos los paquetes»', () => {
  it('cada paquete trae su código como enlace a la ficha, su estado en español, su viaje y su peso', () => {
    view({ packages: [pkg('a'), pkg('b', { status: 'en_agencia', route_id: 'r1', transport_routes: { departure_time: '2026-12-27T10:00:00Z' } }), pkg('c', { status: 'siniestro' })] });
    expect(screen.getByRole('link', { name: 'TRK-a' })).toHaveAttribute('href', '/logistics/packages/a');
    expect(screen.getByText('En agencia')).toBeInTheDocument();      // antes salía como «en_agencia»
    expect(screen.getByText('Siniestro')).toBeInTheDocument();
    expect(screen.getByText(/Viaje del 27 dic/)).toBeInTheDocument(); // un viaje de OTRO día también se ve aquí
    expect(screen.getAllByText('Sin viaje')).toHaveLength(2);   // los dos que no tienen viaje
    expect(screen.getByRole('status')).toHaveTextContent('3 paquetes');
  });
  it('avisa cuando la lista llegó al tope y puede haber paquetes más antiguos', () => {
    view({ packages: [pkg('a')], truncatedAt: 200 });
    expect(screen.getByRole('status')).toHaveTextContent('1 paquete · se muestran los 200 más recientes: usa el buscador');
  });
  it('sin resultados explica por qué y deja quitar el filtro', async () => {
    const onClear = vi.fn();
    view({ packages: [], searching: true, onClear });
    expect(screen.getByText('Ningún paquete coincide con la búsqueda')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /quitar el filtro/i }));
    expect(onClear).toHaveBeenCalled();
  });
  it('sin paquetes y sin filtro lo dice', () => {
    view({ packages: [] });
    expect(screen.getByText('Todavía no hay paquetes')).toBeInTheDocument();
  });
});
