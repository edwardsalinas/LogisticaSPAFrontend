import { describe, expect, it, vi } from 'vitest';
import assistAssign, { findPackages, pickIndex } from './assistAssign';
import { StopError } from '../guidedForms';

const NOW = Date.now();
const iso = (hours) => new Date(NOW + hours * 3600 * 1000).toISOString();
const PKGS = [
  { id: 'p1', tracking_code: 'TRK-1795-AAAA4531', status: 'pendiente', origen: 'La Paz', destino: 'Oruro', peso: 4, recipient_name: 'Rosa Quispe', sender_name: 'María López' },
  { id: 'p2', tracking_code: 'TRK-1795-BBBB9902', status: 'pendiente', origen: 'La Paz', destino: 'Oruro', peso: 12, recipient_name: 'Rosa Flores', sender_name: 'Pedro Gómez' },
  { id: 'p3', tracking_code: 'TRK-1795-CCCC1111', status: 'asignado', route_id: 'r9', origen: 'La Paz', destino: 'Oruro', peso: 2, recipient_name: 'Carlos Mamani' },
  { id: 'p4', tracking_code: 'TRK-1795-DDDD2222', status: 'pendiente', origen: 'Oruro', destino: 'Potosí', peso: 6, recipient_name: 'Elena Choque' },
];
const ROUTES = [
  { id: 'aaaaaaaa-1111-2222-3333-bbbbbbbbbbbb', route_code: 'RT-1', origin: 'La Paz', destination: 'Oruro', status: 'planeada', departure_time: iso(20) },
  { id: 'cccccccc-1111-2222-3333-dddddddddddd', route_code: null, origin: 'La Paz', destination: 'Oruro', status: 'planeada', departure_time: iso(30) },
  { id: 'r3', origin: 'La Paz', destination: 'Oruro', status: 'en_transito', departure_time: iso(-2) },
  { id: 'r4', origin: 'La Paz', destination: 'Oruro', status: 'planeada', departure_time: iso(-3) }, // ya pasó
];

const setup = ({ answers, routes = ROUTES, packages = PKGS, prepared = { data: { action: { id: 'act-1', type: 'assign_package' } } } } = {}) => {
  const said = [];
  const q = [...answers];
  const ctx = { signal: new AbortController().signal, say: vi.fn(async (t) => { said.push(t); }) };
  const io = {
    listen: vi.fn(async () => (q.length ? q.shift() : null)),
    api: { getPackages: vi.fn(async () => ({ data: packages })), getRoutes: vi.fn(async () => ({ data: routes })), prepareAssignment: vi.fn(async () => prepared) },
  };
  return { ctx, io, said };
};

describe('findPackages / pickIndex', () => {
  it('por los últimos números del código o por el nombre (todas las palabras)', () => {
    expect(findPackages('4531', PKGS).map((p) => p.id)).toEqual(['p1']);
    expect(findPackages('para rosa', PKGS).map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(findPackages('rosa quispe', PKGS).map((p) => p.id)).toEqual(['p1']);
    expect(findPackages('nadie', PKGS)).toEqual([]);
    expect(findPackages('', PKGS)).toEqual([]);
  });
  it('«el primero», «el segundo» y «el de las ocho»', () => {
    expect(pickIndex('el segundo', ['a', 'b', 'c'])).toBe(1);
    expect(pickIndex('el tercero', ['a', 'b'])).toBe(-1);
    expect(pickIndex('el de las ocho', [{ h: 8 }, { h: 14 }], (o) => o.h)).toBe(0);
    expect(pickIndex('a las 2', [{ h: 8 }, { h: 14 }], (o) => o.h)).toBe(1);
  });
});

describe('assistAssign: Logi pregunta qué paquete y a qué viaje, y prepara la asignación', () => {
  it('un paquete y varios viajes: elige por ordinal y devuelve la propuesta del servidor', async () => {
    const { ctx, io } = setup({ answers: ['rosa quispe', 'sí', 'el segundo'] });
    const out = await assistAssign(ctx, io);
    expect(out.done).toBe(true);
    expect(out.proposal.id).toBe('act-1');
    // el segundo viaje no tiene código: se usa su id internamente
    expect(io.api.prepareAssignment).toHaveBeenCalledWith({ route_ref: 'cccccccc-1111-2222-3333-dddddddddddd', codes: ['TRK-1795-AAAA4531'] });
  });

  it('nunca nombra un viaje por su identificador y solo ofrece los planeados que aún no salieron del mismo trayecto', async () => {
    const { ctx, io, said } = setup({ answers: ['4531', 'sí', 'el primero'] });
    await assistAssign(ctx, io);
    const offer = said.find((t) => /Hay 2 viajes/.test(t));
    expect(offer).toMatch(/el viaje de La Paz a Oruro/);
    expect(said.join(' ')).not.toMatch(/RT-1|[0-9a-f]{8}-[0-9a-f]{4}/);
    expect(io.api.prepareAssignment.mock.calls[0][0].route_ref).toBe('RT-1');
  });

  it('con varios paquetes que coinciden, pregunta cuál', async () => {
    const { ctx, io, said } = setup({ answers: ['rosa', 'el segundo', 'el primero'] });
    const out = await assistAssign(ctx, io);
    expect(said.some((t) => /Encontré 2/.test(t))).toBe(true);
    expect(io.api.prepareAssignment.mock.calls[0][0].codes).toEqual(['TRK-1795-BBBB9902']);
    expect(out.done).toBe(true);
  });

  it('un solo viaje: lo propone y pide un «sí»; un «no» no prepara nada', async () => {
    const one = ROUTES.slice(0, 1);
    const yes = setup({ answers: ['rosa quispe', 'sí', 'sí'], routes: one });
    expect((await assistAssign(yes.ctx, yes.io)).done).toBe(true);
    const no = setup({ answers: ['rosa quispe', 'sí', 'no'], routes: one });
    expect((await assistAssign(no.ctx, no.io)).done).toBe(false);
    expect(no.io.api.prepareAssignment).not.toHaveBeenCalled();
  });

  it('sin viajes planeados del trayecto, lo dice y no prepara nada', async () => {
    const { ctx, io, said } = setup({ answers: ['elena choque', 'sí'] });
    const out = await assistAssign(ctx, io);
    expect(out.done).toBe(false);
    expect(said.at(-1)).toMatch(/No hay viajes planeados de Oruro a Potosí/);
  });

  it('sin paquetes pendientes avisa de inmediato', async () => {
    const { ctx, io, said } = setup({ answers: [], packages: [PKGS[2]] });
    expect((await assistAssign(ctx, io)).done).toBe(false);
    expect(said.at(-1)).toMatch(/no tienes paquetes pendientes/i);
  });

  it('si el servidor rechaza (no cabe), Logi lo dice con las palabras del servidor', async () => {
    const { ctx, io, said } = setup({ answers: ['rosa quispe', 'sí', 'el primero'] });
    io.api.prepareAssignment.mockRejectedValue(new Error('El viaje no tiene espacio suficiente.'));
    const out = await assistAssign(ctx, io);
    expect(out.done).toBe(false);
    expect(said.at(-1)).toMatch(/No pude asignarlo: El viaje no tiene espacio suficiente/);
  });

  it('«cancela», silencios o no entender dejan todo como estaba', async () => {
    const c = setup({ answers: ['cancela'] });
    expect((await assistAssign(c.ctx, c.io)).done).toBe(false);
    const s = setup({ answers: [null, null, null] });
    expect((await assistAssign(s.ctx, s.io)).done).toBe(false);
    expect(s.said.at(-1)).toMatch(/No logro encontrar el paquete/);
    expect(s.io.api.prepareAssignment).not.toHaveBeenCalled();
  });

  it('si detienen a Logi (StopError) se propaga', async () => {
    const { ctx, io } = setup({ answers: [] });
    io.listen = vi.fn(async () => { throw new StopError(); });
    await expect(assistAssign(ctx, io)).rejects.toBeInstanceOf(StopError);
  });
});
