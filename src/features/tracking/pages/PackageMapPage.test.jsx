import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../services/apiService', () => ({ default: { getMapData: vi.fn() } }));
vi.mock('../components/PackageTrackingMap', () => ({ default: () => <div>mapa</div> }));

import apiService from '../../../services/apiService';
import PackageMapPage from './PackageMapPage';

const DATA = {
  package: { tracking_code: 'TRK-1', origen: 'La Paz', destino: 'Oruro' },
  route: { status: 'active' },
  checkpoints: [],
  tracking_logs: [],
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/tracking/abc/map']}>
      <Routes>
        <Route path="/tracking/:packageId/map" element={<PackageMapPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('PackageMapPage', () => {
  it('muestra el paquete al terminar de cargar (antes se rompía: un hook estaba después de un return anticipado)', async () => {
    apiService.getMapData.mockResolvedValue({ data: DATA });
    renderPage();

    expect(await screen.findByRole('heading', { name: 'TRK-1' })).toBeInTheDocument();
    expect(screen.getAllByText('En ruta').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /volver/i })).toBeInTheDocument();
  });

  it('si el paquete no se puede cargar, lo dice y ofrece volver', async () => {
    apiService.getMapData.mockRejectedValue(new Error('404'));
    renderPage();

    expect(await screen.findByText(/no encontramos el paquete/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /volver a tracking/i })).toBeInTheDocument();
  });
});
