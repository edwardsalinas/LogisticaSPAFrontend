import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const toggleAiMode = vi.fn();
const logout = vi.fn();
let mockRoles = ['admin'];
let mockAiMode = false;

vi.mock('../../app/AiModeContext', () => ({ useAiMode: () => ({ aiMode: mockAiMode, toggleAiMode }) }));
vi.mock('../../app/AuthContext', () => ({ useAuth: () => ({ logout }) }));
vi.mock('../../app/useRole', () => ({ default: () => ({ hasRole: (roles) => roles.some((r) => mockRoles.includes(r)) }) }));

import CommandPalette from './CommandPalette';

function Where() {
  const loc = useLocation();
  return <p data-testid="donde">{loc.pathname}|{loc.state?.prefill ?? ''}</p>;
}

const renderPalette = (onOpenChange = vi.fn()) => {
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <CommandPalette open onOpenChange={onOpenChange} />
      <Routes>
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
  return onOpenChange;
};

describe('CommandPalette (Ctrl+K)', () => {
  beforeEach(() => {
    toggleAiMode.mockClear();
    logout.mockClear();
    mockRoles = ['admin'];
    mockAiMode = false;
  });

  it('solo ofrece las pantallas que el rol puede ver', () => {
    mockRoles = ['client'];
    renderPalette();
    const opciones = screen.getAllByRole('option').map((o) => o.textContent);
    expect(opciones.some((t) => /Paquetes/.test(t))).toBe(true);
    expect(opciones.some((t) => /Tracking/.test(t))).toBe(true);
    expect(opciones.some((t) => /Flota/.test(t))).toBe(false); // solo el administrador
    expect(opciones.some((t) => /Reportes/.test(t))).toBe(false);
  });

  it('ir a una pantalla navega y cierra la paleta', async () => {
    const onOpenChange = renderPalette();
    await userEvent.click(screen.getByRole('option', { name: /Paquetes/ }));
    expect(screen.getByTestId('donde').textContent).toBe('/logistics/packages|');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('con un código TRK ofrece preguntar dónde está y deja la pregunta escrita en el asistente (no la envía)', async () => {
    renderPalette();
    await userEvent.type(screen.getByRole('combobox'), 'trk-1795-abc');
    const opcion = await screen.findByRole('option', { name: /¿Dónde está el paquete TRK-1795-ABC\?/ });
    await userEvent.click(opcion);
    expect(screen.getByTestId('donde').textContent).toBe('/assistant|¿Dónde está el paquete TRK-1795-ABC?');
  });

  it('un texto cualquiera se ofrece como pregunta al asistente', async () => {
    renderPalette();
    await userEvent.type(screen.getByRole('combobox'), 'viajes con espacio');
    await userEvent.click(await screen.findByRole('option', { name: /Preguntar al asistente/ }));
    expect(screen.getByTestId('donde').textContent).toBe('/assistant|viajes con espacio');
  });

  it('en Modo IA el asistente es la página de inicio', async () => {
    mockAiMode = true;
    renderPalette();
    await userEvent.type(screen.getByRole('combobox'), 'hola');
    await userEvent.click(await screen.findByRole('option', { name: /Preguntar al asistente/ }));
    expect(screen.getByTestId('donde').textContent).toBe('/|hola');
  });

  it('cerrar sesión llama al cierre de sesión', async () => {
    renderPalette();
    await userEvent.click(screen.getByRole('option', { name: /Cerrar sesión/ }));
    expect(logout).toHaveBeenCalledTimes(1);
  });
});
