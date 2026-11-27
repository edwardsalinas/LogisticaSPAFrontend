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
    expect(runScreenCommands([{ kind: 'package_list' }, { kind: 'ui_command', page: 'packages', search: 'TRK-1' }, { kind: 'ui_command', page: 'nada' }]).done).toBe(1);
    expect(navigate).toHaveBeenCalledTimes(1);
  });
});

describe('filtros finos de una pantalla', () => {
  it('pone la fecha de Paquetes, el rango de Reportes y origen/destino/tipo de Viajes', () => {
    as('admin');
    runScreenCommand({ page: 'packages', fields: { date: '2026-11-30' } });
    expect(JSON.parse(window.sessionStorage.getItem('logisticaspa:filtros:paquetes:fecha'))).toBe('2026-11-30');
    runScreenCommand({ page: 'analytics', fields: { range: { from: '2026-11-01', to: '2026-11-26' } } });
    expect(JSON.parse(window.sessionStorage.getItem('logisticaspa:filtros:reportes:rango'))).toEqual({ from: '2026-11-01', to: '2026-11-26' });
    runScreenCommand({ page: 'routes', fields: { origin: 'La Paz', destination: 'Oruro', type: 'schedule' } });
    expect(JSON.parse(window.sessionStorage.getItem('logisticaspa:filtros:viajes:origen'))).toBe('La Paz');
    expect(JSON.parse(window.sessionStorage.getItem('logisticaspa:filtros:viajes:destino'))).toBe('Oruro');
    expect(JSON.parse(window.sessionStorage.getItem('logisticaspa:filtros:viajes:tipo'))).toBe('schedule');
  });
  it('ignora lo que no es válido: campos que la pantalla no tiene, fechas imposibles, rangos largos o al revés, tipos inventados', () => {
    as('admin');
    runScreenCommand({ page: 'fleet', fields: { date: '2026-11-30' } });
    runScreenCommand({ page: 'packages', fields: { date: 'mañana' } });
    runScreenCommand({ page: 'analytics', fields: { range: { from: '2026-11-26', to: '2026-11-01' } } });
    runScreenCommand({ page: 'analytics', fields: { range: { from: '2026-01-01', to: '2026-11-26' } } });
    runScreenCommand({ page: 'routes', fields: { type: 'raro', origin: 'x'.repeat(100) } });
    expect(window.sessionStorage.length).toBe(0);
  });
});

describe('decir la verdad: lo que no se pudo hacer se informa', () => {
  it('cuenta lo hecho y lo que no, con el motivo', () => {
    as('client');
    const out = runScreenCommands([
      { kind: 'ui_command', page: 'packages', search: 'TRK-1' },
      { kind: 'ui_command', page: 'fleet', label: 'la Flota' },
      { kind: 'ui_command', page: 'nada' },
      { kind: 'ui_command', page: 'tracking', tab: 'inventada' },
    ]);
    expect(out.done).toBe(1);
    expect(out.problems).toEqual([
      'tu rol no tiene la Flota',
      'no conozco la pantalla «nada»',
      'esa pantalla no tiene la pestaña «inventada»',
    ]);
  });
  it('un filtro que la pantalla no admite o con valor inválido se informa; un buscador vacío en una pantalla sin buscador, no', () => {
    as('admin');
    const report = [];
    expect(runScreenCommand({ page: 'analytics', search: '', fields: { range: { from: '2026-11-26', to: '2026-11-01' }, origin: 'x' } }, report)).toBe(false);
    expect(report).toEqual(['no pude aplicar el filtro «range»', 'no pude aplicar el filtro «origin»']);
    const ok = [];
    expect(runScreenCommand({ page: 'analytics', search: '' }, ok)).toBe(true);
    expect(ok).toEqual([]);
  });
  it('sin pantalla registrada lo dice', () => {
    unregister?.(); unregister = null;
    expect(runScreenCommands([{ kind: 'ui_command', page: 'packages' }])).toEqual({ done: 0, problems: ['la pantalla no estaba lista'] });
  });
});


describe('seguridad: nombres heredados', () => {
  it('«constructor», «__proto__» o «toString» como pantalla no hacen nada ni rompen', () => {
    const navigate = as('admin');
    for (const page of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) {
      const report = [];
      expect(runScreenCommand({ page }, report)).toBe(false);
      expect(report[0]).toMatch(/no conozco la pantalla/);
    }
    expect(navigate).not.toHaveBeenCalled();
  });
});
