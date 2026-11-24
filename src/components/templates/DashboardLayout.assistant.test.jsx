import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Link, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardLayout from './DashboardLayout';

let wide = true;
vi.mock('../../hooks/useMediaQuery', () => ({ default: () => wide }));
vi.mock('../../app/AiModeContext', () => ({ useAiMode: () => ({ aiMode: false }) }));
vi.mock('../../app/useRole', () => ({ default: () => ({ role: 'admin', hasRole: () => true }) }));
vi.mock('../../features/ai-chat/components/AiAssistantPanel', () => ({ default: () => <div>Panel del asistente</div> }));
vi.mock('../organisms/Navbar', () => ({ default: () => <header>Navbar</header> }));
vi.mock('../organisms/Sidebar', () => ({ default: () => <nav>Sidebar</nav>, getNavItems: () => [] }));
vi.mock('../organisms/CommandPalette', () => ({ default: () => null }));

const renderApp = () => render(
  <MemoryRouter initialEntries={['/dashboard']}>
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<Link to="/logistics/packages">ir a paquetes</Link>} />
        <Route path="/logistics/packages" element={<p>Pantalla de paquetes</p>} />
      </Route>
    </Routes>
  </MemoryRouter>,
);

describe('Panel flotante del asistente al navegar', () => {
  beforeEach(() => { window.sessionStorage.clear(); wide = true; });

  it('en escritorio sigue abierto al cambiar de pantalla y no tapa la pantalla con un fondo', async () => {
    renderApp();
    await userEvent.click(screen.getByRole('button', { name: /abrir asistente ia/i }));
    expect(screen.getByText('Panel del asistente')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cerrar panel del asistente/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('link', { name: /ir a paquetes/i }));
    expect(screen.getByText('Pantalla de paquetes')).toBeInTheDocument();
    expect(screen.getByText('Panel del asistente')).toBeInTheDocument();
  });

  it('en celular se cierra al navegar para dejar ver la pantalla de destino', async () => {
    wide = false;
    renderApp();
    await userEvent.click(screen.getByRole('button', { name: /abrir asistente ia/i }));
    expect(screen.getByRole('button', { name: /cerrar panel del asistente/i })).toBeInTheDocument(); // fondo táctil para cerrar

    await userEvent.click(screen.getByRole('link', { name: /ir a paquetes/i }));
    expect(screen.queryByText('Panel del asistente')).not.toBeInTheDocument();
  });

  it('Escape cierra el panel', async () => {
    renderApp();
    await userEvent.click(screen.getByRole('button', { name: /abrir asistente ia/i }));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByText('Panel del asistente')).not.toBeInTheDocument();
  });
});
