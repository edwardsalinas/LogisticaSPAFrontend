import { describe, expect, it } from 'vitest';
import { formatTripLabel, matchesPackage, plain, tripDate } from './packageSearch';

const pkg = (o = {}) => ({ id: 'p1', tracking_code: 'TRK-1795-AB12', origen: 'La Paz', destino: 'Potosí', recipient_name: 'Jorge López', sender_name: 'Edmundo Nogales', status: 'en_transito', ...o });

describe('búsqueda de paquetes (la misma en el tablero, la lista «Todos» y Seguimiento)', () => {
  it('sin texto, todo coincide', () => {
    expect(matchesPackage(pkg(), '')).toBe(true);
    expect(matchesPackage(pkg(), '   ')).toBe(true);
    expect(matchesPackage(pkg(), undefined)).toBe(true);
  });
  it('ignora mayúsculas y tildes', () => {
    expect(matchesPackage(pkg(), 'potosi')).toBe(true);
    expect(matchesPackage(pkg(), 'JORGE LOPEZ')).toBe(true);
    expect(matchesPackage(pkg(), 'trk-1795')).toBe(true);
  });
  it('busca por código, origen, destino, destinatario, remitente y estado (con espacios)', () => {
    for (const t of ['AB12', 'la paz', 'potos', 'lópez', 'nogales', 'en transito']) expect(matchesPackage(pkg(), t), t).toBe(true);
  });
  it('lo que no está, no coincide', () => {
    expect(matchesPackage(pkg(), 'oruro')).toBe(false);
    expect(matchesPackage(pkg({ tracking_code: undefined, recipient_name: null }), 'zzz')).toBe(false);
  });
  it('plain quita tildes y pasa a minúsculas', () => { expect(plain('ÁÉÍÓÚ ñandú')).toBe('aeiou nandu'); });
});

describe('viaje del paquete', () => {
  it('sin viaje; con viaje pero sin hora; y con hora (en hora de Bolivia)', () => {
    expect(formatTripLabel(pkg())).toBe('Sin viaje');
    expect(formatTripLabel(pkg({ route_id: 'r1' }))).toBe('Con viaje');
    expect(tripDate(pkg())).toBeNull();
    expect(tripDate(pkg({ transport_routes: { departure_time: 'no es fecha' } }))).toBeNull();
    const label = formatTripLabel(pkg({ route_id: 'r1', transport_routes: { departure_time: '2026-11-28T08:30:00Z' } }));
    expect(label).toMatch(/^Viaje del 28 nov/);
  });
});
