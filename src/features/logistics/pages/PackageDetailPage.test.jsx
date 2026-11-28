import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiService from '../../../services/apiService';
import PackageDetailPage from './PackageDetailPage';

vi.mock('../../../services/apiService', () => ({ default: { getPackage: vi.fn(), get: vi.fn() } }));
vi.mock('../components/PackageLocationMap', () => ({ default: () => <div data-testid="mapa" /> }));

const PKG = { id: 'p1', tracking_code: 'TRK-REAL-1', origen: 'La Paz', destino: 'Potosí', status: 'en_agencia', peso: 4.5, description: 'Repuestos', recipient_name: 'Jorge López', sender_name: 'Edmundo Nogales', created_at: '2026-11-28T12:00:00Z', route_id: null, transport_routes: null };
const renderAt = (id = 'p1') => render(<MemoryRouter initialEntries={[`/logistics/packages/${id}`]}><Routes><Route path="/logistics/packages/:packageId" element={<PackageDetailPage />} /></Routes></MemoryRouter>);

beforeEach(() => {
  apiService.getPackage.mockReset();
  apiService.get.mockReset();
  apiService.get.mockResolvedValue({ data: [] });
});

describe('ficha del paquete', () => {
  it('trae el paquete por su id (no de una lista recortada) y muestra SUS datos', async () => {
    apiService.getPackage.mockResolvedValue({ data: PKG });
    apiService.get.mockResolvedValue({ data: [{ status: 'pendiente', timestamp: '2026-11-28T12:00:00Z' }, { status: 'en_agencia', timestamp: '2026-11-28T15:00:00Z', observations: 'Llegó a agencia La Paz' }] });
    renderAt();
    expect(await screen.findByRole('heading', { name: 'TRK-REAL-1' })).toBeInTheDocument();
    expect(apiService.getPackage).toHaveBeenCalledWith('p1');
    expect(apiService.get).toHaveBeenCalledWith('/tracking/logs/p1');
    expect(screen.getAllByText('En agencia').length).toBeGreaterThan(0);   // estado en español, no «en_agencia»
    expect(screen.getByText('4.5 kg')).toBeInTheDocument();
    expect(screen.getByText('Llegó a agencia La Paz')).toBeInTheDocument(); // el cronograma sale del historial real
    expect(screen.getByText('Jorge López')).toBeInTheDocument();
  });

  it('NO inventa datos: ni el 65 % de avance, ni dimensiones, ni prioridad, ni el cronograma de ejemplo', async () => {
    apiService.getPackage.mockResolvedValue({ data: PKG });
    renderAt();
    await screen.findByRole('heading', { name: 'TRK-REAL-1' });
    const text = document.body.textContent;
    expect(text).not.toMatch(/65\s?%/);
    expect(text).not.toMatch(/60x40x40|Dimensiones|Prioridad|Estandar/);
    expect(text).not.toMatch(/19 Mar|Recolectado|SPA-7749202394/);
    expect(text).toMatch(/75\s?%/);            // el avance sale del estado («en agencia» = 75 %)
  });

  it('un siniestro no muestra un porcentaje inventado', async () => {
    apiService.getPackage.mockResolvedValue({ data: { ...PKG, status: 'siniestro' } });
    renderAt();
    await screen.findByRole('heading', { name: 'TRK-REAL-1' });
    expect(document.body.textContent).not.toMatch(/\d+\s?%/);
    expect(screen.getAllByText('Siniestro').length).toBeGreaterThan(0);
  });

  it('un paquete que no existe (o sin permiso) dice que no se encontró y NO muestra un paquete de ejemplo', async () => {
    apiService.getPackage.mockRejectedValue(Object.assign(new Error('Paquete no encontrado'), { status: 404 }));
    renderAt('no-existe');
    expect(await screen.findByRole('heading', { name: /no encontramos el paquete/i })).toBeInTheDocument();
    expect(screen.getByText(/vista «Todos» de Paquetes/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/SPA-7749202394|Comercializadora El Alto/);
  });

  it('un error del servidor se dice como error, no como «no existe»', async () => {
    apiService.getPackage.mockRejectedValue(Object.assign(new Error('boom'), { status: 500 }));
    renderAt();
    expect(await screen.findByRole('heading', { name: /no pudimos cargar el paquete/i })).toBeInTheDocument();
  });

  it('si el historial falla, la ficha igual se muestra, con el registro del paquete', async () => {
    apiService.getPackage.mockResolvedValue({ data: PKG });
    apiService.get.mockRejectedValue(new Error('sin historial'));
    renderAt();
    await screen.findByRole('heading', { name: 'TRK-REAL-1' });
    await waitFor(() => expect(screen.getByText('Registrado')).toBeInTheDocument());
  });
});
