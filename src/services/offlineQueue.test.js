import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { enqueuePoint, getQueuedPoints, removePoints, countQueued, flushQueue } from './offlineQueue';

const pt = (tripId, minute) => ({
  tripId,
  lat: -17 + minute / 100,
  lng: -66,
  status: 'in_transit',
  timestamp: new Date(Date.UTC(2026, 0, 1, 10, minute)).toISOString(),
});

const hhmm = (p) => p.timestamp.slice(11, 16);

beforeEach(async () => {
  const items = await getQueuedPoints();
  await removePoints(items.map((i) => i.key));
});

describe('cola offline de puntos GPS', () => {
  it('envía por viaje, en orden cronológico, y vacía la cola', async () => {
    await enqueuePoint(pt('A', 3));
    await enqueuePoint(pt('A', 1));
    await enqueuePoint(pt('B', 2));
    await enqueuePoint(pt('A', 2));

    const calls = [];
    const result = await flushQueue(async (trip, points) => {
      calls.push([trip, points.map(hhmm)]);
      return { arrived: trip === 'B' };
    });

    expect(calls).toEqual([['A', ['10:01', '10:02', '10:03']], ['B', ['10:02']]]);
    expect(result).toEqual({ sent: 4, remaining: 0, arrived: true });
  });

  it('sin red conserva todos los puntos', async () => {
    await enqueuePoint(pt('A', 1));
    await enqueuePoint(pt('A', 2));
    const result = await flushQueue(async () => {
      throw Object.assign(new Error('Network Error'), { isNetworkError: true });
    });
    expect(result).toEqual({ sent: 0, remaining: 2, arrived: false });
  });

  it('ante un error parcial elimina solo lo ya procesado por el servidor', async () => {
    await enqueuePoint(pt('A', 1));
    await enqueuePoint(pt('A', 2));
    const result = await flushQueue(async () => {
      throw Object.assign(new Error('boom'), { status: 500, data: { processed: 1 } });
    });
    expect(result).toEqual({ sent: 1, remaining: 1, arrived: false });
  });

  it('descarta el lote ante un 4xx definitivo (p. ej. viaje ajeno) para no bloquear la cola', async () => {
    await enqueuePoint(pt('A', 1));
    const result = await flushQueue(async () => {
      throw Object.assign(new Error('forbidden'), { status: 403, data: {} });
    });
    expect(result).toEqual({ sent: 0, remaining: 0, arrived: false });
  });

  it('conserva la cola con 401 (sesión vencida) y 429', async () => {
    await enqueuePoint(pt('A', 1));
    await flushQueue(async () => { throw Object.assign(new Error('401'), { status: 401, data: {} }); });
    expect(await countQueued()).toBe(1);
    await flushQueue(async () => { throw Object.assign(new Error('429'), { status: 429, data: {} }); });
    expect(await countQueued()).toBe(1);
  });

  it('divide el envío en lotes de 200 puntos', async () => {
    for (let i = 0; i < 450; i += 1) await enqueuePoint(pt('Z', i % 59));
    const sizes = [];
    await flushQueue(async (_trip, points) => {
      sizes.push(points.length);
      return {};
    });
    expect(sizes).toEqual([200, 200, 50]);
  });
});
