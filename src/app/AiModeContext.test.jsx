import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AiModeProvider, useAiMode } from './AiModeContext';
import { getNavItems, navItems } from '../components/organisms/Sidebar';
import Navbar from '../components/organisms/Navbar';

let mockUser = { id: 'u1' };
vi.mock('./AuthContext', () => ({ useAuth: () => ({ user: mockUser, logout: vi.fn() }) }));

function Probe() {
  const { aiMode, toggleAiMode } = useAiMode();
  return <button onClick={toggleAiMode}>{aiMode ? 'ia-on' : 'ia-off'}</button>;
}

const renderProbe = () => render(<AiModeProvider><Probe /></AiModeProvider>);

describe('Modo IA (preferencia)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockUser = { id: 'u1' };
  });

  it('por defecto está desactivado: la aplicación se ve como siempre', () => {
    renderProbe();
    expect(screen.getByRole('button')).toHaveTextContent('ia-off');
  });

  it('se activa, se recuerda al volver a abrir y se desactiva', async () => {
    const first = renderProbe();
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveTextContent('ia-on');
    expect(window.localStorage.getItem('logistica:ai-mode:u1')).toBe('1');
    first.unmount();

    renderProbe(); // "recargar la página"
    expect(screen.getByRole('button')).toHaveTextContent('ia-on');
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveTextContent('ia-off');
    expect(window.localStorage.getItem('logistica:ai-mode:u1')).toBe('0');
  });

  it('la preferencia es por usuario', async () => {
    window.localStorage.setItem('logistica:ai-mode:u1', '1');
    const { unmount } = renderProbe();
    expect(screen.getByRole('button')).toHaveTextContent('ia-on');
    unmount();

    mockUser = { id: 'u2' };
    renderProbe();
    expect(screen.getByRole('button')).toHaveTextContent('ia-off');
  });

  it('sin almacenamiento disponible no falla (queda en modo clásico)', async () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado'); });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqueado'); });
    renderProbe();
    expect(screen.getByRole('button')).toHaveTextContent('ia-off');
    await act(async () => { await userEvent.click(screen.getByRole('button')); });
    expect(screen.getByRole('button')).toHaveTextContent('ia-on'); // vale para la sesión aunque no se pueda guardar
    spy.mockRestore();
    set.mockRestore();
  });
});

describe('menú según el modo', () => {
  it('modo clásico: el menú no cambia', () => {
    expect(getNavItems(false)).toBe(navItems);
    expect(getNavItems(false)[0].path).toBe('/');
    expect(getNavItems(false)[0].label).toBe('Dashboard');
  });

  it('Modo IA: el Asistente es lo primero y el Dashboard pasa a /dashboard (admin y operador)', () => {
    const items = getNavItems(true);
    expect(items[0]).toMatchObject({ path: '/', label: 'Asistente' });
    expect(items[0].roles).toEqual(expect.arrayContaining(['admin', 'logistics_operator', 'client', 'driver']));
    const dash = items.find((i) => i.label === 'Dashboard');
    expect(dash.path).toBe('/dashboard');
    expect(dash.roles).toEqual(['admin', 'logistics_operator']);
    expect(items.length).toBe(navItems.length + 1);
  });
});

describe('interruptor "Modo IA" de la barra superior', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockUser = { id: 'u1' };
  });

  it('es un interruptor accesible que activa y desactiva el modo', async () => {
    render(<MemoryRouter><AiModeProvider><Navbar title="Dashboard" /></AiModeProvider></MemoryRouter>);
    const toggle = screen.getByRole('switch', { name: /modo ia/i });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });
});
