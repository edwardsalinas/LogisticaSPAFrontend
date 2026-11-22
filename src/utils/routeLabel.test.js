import { describe, it, expect } from 'vitest';
import { routeLabel, routeName, routeTitle, routeWhen } from './routeLabel';

const route = { id: 'a76e66aa-1111-2222-3333-444455556666', origin: 'La Paz', destination: 'Caracollo', departure_time: '2026-11-22T10:30:00Z' };

describe('Nombre legible de una ruta', () => {
  it('sin código, describe el trayecto en vez de recortar el UUID', () => {
    expect(routeName(route)).toBe('La Paz → Caracollo');
    expect(routeName(route)).not.toMatch(/a76e66|RT-/i);
  });
  it('si la ruta tiene código, lo respeta', () => {
    expect(routeName({ ...route, route_code: 'RT-001' })).toBe('RT-001');
  });
  it('la hora sale en horario de Bolivia (UTC-4)', () => {
    expect(routeWhen(route)).toMatch(/22/);
    expect(routeWhen(route)).toMatch(/06:30/);
  });
  it('etiqueta completa con la salida', () => {
    expect(routeLabel(route)).toMatch(/^La Paz → Caracollo · .*22.*06:30$/);
  });
  it('tolera datos incompletos', () => {
    expect(routeName({})).toBe('Ruta sin nombre');
    expect(routeTitle({ origin: 'La Paz' })).toBe('');
    expect(routeWhen({ departure_time: 'basura' })).toBe('');
    expect(routeLabel({ origin: 'A', destination: 'B' })).toBe('A → B');
  });
});
