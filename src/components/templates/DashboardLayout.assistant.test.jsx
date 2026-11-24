import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Link, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardLayout from './DashboardLayout';

let wide = true;
let docking = false;
let mockChat = { messages: [], loading: false, settledActions: new Set() };
vi.mock('../../hooks/useMediaQuery', () => ({ default: (q) => (q.includes('1280') ? docking : wide) }));
vi.mock('../../features/ai-chat/useAssistantChat', () => ({ default: () => mockChat, ChatContext: { Provider: ({ children }) => children } }));
vi.mock('../../app/AiModeContext', () => ({ useAiMode: () => ({ aiMode: false }) }));
vi.mock('../../app/useRole', () => ({ default: () => ({ role: 'admin', hasRole: () => true }) }));
vi.mock('../../features/ai-chat/components/AiAssistantPanel', () => ({ default: () => <div>Panel del asistente</div> }));
vi.mock('../organisms/Navbar', () => ({ default: () => <header>Navbar</header> }));
vi.mock('../organisms/Sidebar', () => ({ default: () => <nav>Sidebar</nav>, getNavItems: () => [] }));
vi.mock('../organisms/CommandPalette', () => ({ default: () => null }));

// el panel ya no se acopla: ningún contenedor debe reservarle espacio
const reserved = (container) => [...container.querySelectorAll('div')].find((d) => d.className.includes('xl:pr-[28rem]')) ?? null;

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
  beforeEach(() => {
    window.sessionStorage.clear();
    wide = true;
    docking = false;
    mockChat = { messages: [], loading: false, settledActions: new Set() };
  });

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

  it('en pantalla ancha el panel flota encima: no reserva espacio y el botón sigue para cerrarlo', async () => {
    docking = true;
    const { container } = renderApp();
    await userEvent.click(screen.getByRole('button', { name: /abrir asistente ia/i }));

    expect(reserved(container)).toBeNull(); // el contenido conserva todo su ancho
    expect(screen.queryByRole('button', { name: /abrir asistente ia/i })).not.toBeInTheDocument(); // Logi pasa al encabezado del chat
    expect(screen.getByText('Panel del asistente')).toBeInTheDocument();
  });

  it('en celular la capa del chat deja libres la barra superior y el menú inferior', async () => {
    wide = false;
    renderApp();
    await userEvent.click(screen.getByRole('button', { name: /abrir asistente ia/i }));
    const layer = screen.getByRole('button', { name: /cerrar panel del asistente/i });
    expect(layer.className).not.toContain('inset-0'); // no cubre toda la pantalla
    expect(layer.className).toContain('top-[5.25rem]');
    expect(layer.className).toContain('bottom-24');
  });

  it('el robot del botón refleja lo que hace el asistente', () => {
    mockChat = { messages: [], loading: true, settledActions: new Set() };
    const { container } = renderApp();
    expect(container.querySelector('svg.logi')).toHaveAttribute('data-mood', 'thinking');
  });

  it('en pantalla mediana el panel flota encima y el contenido no cambia', async () => {
    const { container } = renderApp();
    await userEvent.click(screen.getByRole('button', { name: /abrir asistente ia/i }));
    expect(reserved(container)).toBeNull();
    expect(screen.getByText('Panel del asistente')).toBeInTheDocument();
  });

  it('el botón avisa cuando el asistente espera una confirmación (con punto y texto)', () => {
    mockChat = { messages: [{ role: 'assistant', content: 'x', attachments: [{ kind: 'action_proposal', action: { id: 'a', expires_at: '2999-01-01T00:00:00Z' } }] }], loading: false, settledActions: new Set() };
    renderApp();
    expect(screen.getByRole('button', { name: /abrir asistente ia, espera tu confirmación/i })).toBeInTheDocument();
    expect(screen.getByTestId('assistant-badge')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Espera tu confirmación');
  });

  it('mientras piensa lo dice, sin punto de aviso', () => {
    mockChat = { messages: [], loading: true, settledActions: new Set() };
    renderApp();
    expect(screen.getByRole('button', { name: /abrir asistente ia, pensando/i })).toBeInTheDocument();
    expect(screen.queryByTestId('assistant-badge')).not.toBeInTheDocument();
  });

  it('sin novedades no hay aviso', () => {
    renderApp();
    expect(screen.queryByTestId('assistant-badge')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^abrir asistente ia$/i })).toBeInTheDocument();
  });
});
