import { describe, expect, it, vi } from 'vitest';
import assistEvent, { parseEventStatus } from './assistEvent';
import { StopError } from '../guidedForms';

const PKGS = [
  { id: 'p1', tracking_code: 'TRK-1795-AAAA4531', status: 'en_transito', origen: 'La Paz', destino: 'Oruro', recipient_name: 'Rosa Quispe' },
  { id: 'p2', tracking_code: 'TRK-1795-BBBB9902', status: 'pendiente', origen: 'La Paz', destino: 'Oruro', recipient_name: 'Rosa Flores' },
  { id: 'p3', tracking_code: 'TRK-1795-CCCC1111', status: 'entregado', origen: 'La Paz', destino: 'Oruro', recipient_name: 'Carlos Mamani' },
];

const setup = ({ answers, packages = PKGS, prepared = { data: { action: { id: 'act-1', type: 'register_tracking_event' } } } } = {}) => {
  const said = [];
  const q = [...answers];
  const ctx = { signal: new AbortController().signal, say: vi.fn(async (t) => { said.push(t); }) };
  const io = {
    listen: vi.fn(async () => (q.length ? q.shift() : null)),
    api: { getPackages: vi.fn(async () => ({ data: packages })), prepareEvent: vi.fn(async () => prepared) },
  };
  return { ctx, io, said };
};

describe('parseEventStatus', () => {
  it.each([
    ['en tránsito', 'en_transito'], ['ya va en camino', 'en_transito'], ['salió del almacén de Oruro', 'en_agencia'],
    ['llegó a la agencia', 'en_agencia'], ['hubo un accidente', 'siniestro'], ['se dañó', 'siniestro'], ['siniestro', 'siniestro'],
  ])('«%s» → %s', (t, s) => expect(parseEventStatus(t)).toBe(s));
  it.each(['', 'no sé', 'entregado', 'bien'])('«%s» no se entiende → null', (t) => expect(parseEventStatus(t)).toBeNull());
});

describe('assistEvent: Logi pregunta paquete, estado y nota, y prepara el evento', () => {
  it('camino feliz: devuelve la propuesta del servidor tras un «sí»', async () => {
    const { ctx, io, said } = setup({ answers: ['rosa quispe', 'sí', 'en agencia', 'llegó bien', 'sí, hazlo'] });
    const out = await assistEvent(ctx, io);
    expect(out.done).toBe(true);
    expect(out.proposal.id).toBe('act-1');
    expect(io.api.prepareEvent).toHaveBeenCalledWith({ codes: ['TRK-1795-AAAA4531'], status: 'en_agencia', note: 'Llegó bien' });
    expect(said.some((t) => /está en agencia, con la nota: Llegó bien\. ¿Lo hago\?/.test(t))).toBe(true);
  });

  it('la nota es opcional: «ninguna» no la envía', async () => {
    const { ctx, io } = setup({ answers: ['4531', 'sí', 'en tránsito', 'ninguna', 'sí'] });
    await assistEvent(ctx, io);
    expect(io.api.prepareEvent).toHaveBeenCalledWith({ codes: ['TRK-1795-AAAA4531'], status: 'en_transito' });
  });

  it('no ofrece paquetes ya entregados (no admiten eventos)', async () => {
    const { ctx, io, said } = setup({ answers: ['carlos mamani', 'carlos mamani', 'carlos mamani'] });
    const out = await assistEvent(ctx, io);
    expect(out.done).toBe(false);
    expect(said.at(-1)).toMatch(/No logro encontrar el paquete/);
    expect(io.api.prepareEvent).not.toHaveBeenCalled();
  });

  it('con varios paquetes que coinciden, pregunta cuál', async () => {
    const { ctx, io, said } = setup({ answers: ['rosa', 'el segundo', 'siniestro', 'ninguna', 'sí'] });
    await assistEvent(ctx, io);
    expect(said.some((t) => /Encontré 2/.test(t))).toBe(true);
    expect(io.api.prepareEvent.mock.calls[0][0].codes).toEqual(['TRK-1795-BBBB9902']);
  });

  it('un «no» al final o una duda no registra nada', async () => {
    for (const last of ['no', 'mmm tal vez', null]) {
      const { ctx, io } = setup({ answers: ['4531', 'sí', 'en agencia', 'ninguna', last] });
      const out = await assistEvent(ctx, io);
      expect(out.done).toBe(false);
      expect(out.proposal).toBeUndefined();
    }
  });

  it('si el servidor rechaza, Logi lo dice con las palabras del servidor', async () => {
    const { ctx, io, said } = setup({ answers: ['4531', 'sí', 'en agencia', 'ninguna'] });
    io.api.prepareEvent.mockRejectedValue(new Error('El paquete ya está entregado y no admite nuevos estados.'));
    const out = await assistEvent(ctx, io);
    expect(out.done).toBe(false);
    expect(said.at(-1)).toMatch(/No pude registrarlo: El paquete ya está entregado/);
  });

  it('«cancela» en cualquier paso, o silencios, dejan todo como estaba', async () => {
    const a = setup({ answers: ['4531', 'sí', 'cancela'] });
    expect((await assistEvent(a.ctx, a.io)).done).toBe(false);
    const b = setup({ answers: [null, null, null] });
    expect((await assistEvent(b.ctx, b.io)).done).toBe(false);
    expect(b.io.api.prepareEvent).not.toHaveBeenCalled();
  });

  it('sin paquetes abiertos avisa de inmediato; si detienen a Logi (StopError) se propaga', async () => {
    const none = setup({ answers: [], packages: [PKGS[2]] });
    expect((await assistEvent(none.ctx, none.io)).done).toBe(false);
    const stop = setup({ answers: [] });
    stop.io.listen = vi.fn(async () => { throw new StopError(); });
    await expect(assistEvent(stop.ctx, stop.io)).rejects.toBeInstanceOf(StopError);
  });
});
