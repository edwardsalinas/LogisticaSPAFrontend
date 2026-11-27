import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerScreenRuntime, runScreenCommand, runScreenCommands } from './screenCommands';

let unregister;
const as = (role) => { const navigate = vi.fn(); unregister?.(); unregister = registerScreenRuntime(navigate, role); return navigate; };
afterEach(() => { unregister?.(); unregister = null; window.sessionStorage.clear(); });

describe('órdenes de pantalla del asistente', () => {
  it('va a la pantalla, abre la pestaña y filtra', () => {
    const navigate = as('admin');
    expect(runScreenCommand({ page: 'fleet', tab: 'drivers', search: 'Pérez' })).toBe(true);
    expect(navigate).toHaveBeenCalledWith('/fleet');
    expect(JSON.parse(window.sessionStorage.getItem('logisticaspa:filtros:flota:pestana'))).toBe('drivers');
    expect(JSON.parse(window.sessionStorage.getItem('logisticaspa:filtros:flota:busqueda'))).toBe('Pérez');
  });
  it('filtrar Viajes pasa a la vista de lista (el calendario no usa la búsqueda)', () => {
    as('logistics_operator');
    runScreenCommand({ page: 'routes', search: 'Oruro' });
    expect(JSON.parse(window.sessionStorage.getItem('logisticaspa:filtros:viajes:vista'))).toBe('list');
    expect(JSON.parse(window.sessionStorage.getItem('logisticaspa:filtros:viajes:busqueda'))).toBe('Oruro');
  });
  it('NO se fía de lo que llega: una pantalla inventada, un rol sin permiso o una pestaña que no existe no hacen nada', () => {
    const navigate = as('client');
    expect(runScreenCommand({ page: 'fleet' })).toBe(false); // el cliente no tiene Flota
    expect(runScreenCommand({ page: 'admin-secreto', to: '/admin' })).toBe(false);
    expect(runScreenCommand({ page: 'tracking', tab: 'inventada' })).toBe(true); // la pantalla sí; la pestaña inventada se ignora
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(window.sessionStorage.getItem('logisticaspa:filtros:flota:pestana')).toBeNull();
  });
  it('sin pantalla registrada (fuera del layout) no hace nada', () => {
    unregister?.(); unregister = null;
    expect(runScreenCommand({ page: 'packages' })).toBe(false);
  });
  it('de una respuesta toma solo los adjuntos ui_command', () => {
    const navigate = as('admin');
    expect(runScreenCommands([{ kind: 'package_list' }, { kind: 'ui_command', page: 'packages', search: 'TRK-1' }, { kind: 'ui_command', page: 'nada' }])).toBe(1);
    expect(navigate).toHaveBeenCalledTimes(1);
  });
});
