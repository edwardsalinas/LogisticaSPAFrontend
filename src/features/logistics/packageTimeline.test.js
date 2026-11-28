import { describe, expect, it } from 'vitest';
import { timelineFromLogs } from './packageTimeline';

const pkg = { created_at: '2026-11-28T12:00:00Z', origen: 'La Paz', destino: 'Oruro' };
const log = (status, timestamp, observations = null) => ({ status, timestamp, observations });

describe('cronograma de la ficha: sale del historial REAL del paquete', () => {
  it('ordena del más antiguo al más reciente y deja activo solo el último', () => {
    const steps = timelineFromLogs([log('en_transito', '2026-11-28T14:00:00Z', 'Salió de La Paz'), log('Pendiente', '2026-11-28T12:00:00Z'), log('asignado', '2026-11-28T13:00:00Z')], pkg);
    expect(steps.map((s) => s.label)).toEqual(['Pendiente', 'Asignado', 'En tránsito']);
    expect(steps.map((s) => s.completed)).toEqual([true, true, false]);
    expect(steps.map((s) => s.active)).toEqual([false, false, true]);
    expect(steps[2].location).toBe('Salió de La Paz');
    expect(steps[0].date).toMatch(/28 nov/);
  });
  it('si el último evento es la entrega, todo queda completado y nada activo', () => {
    const steps = timelineFromLogs([log('pendiente', '2026-11-28T12:00:00Z'), log('entregado', '2026-11-28T18:00:00Z')], pkg);
    expect(steps.every((s) => s.completed)).toBe(true);
    expect(steps.some((s) => s.active)).toBe(false);
  });
  it('sin historial muestra solo el registro del paquete (nunca una secuencia de ejemplo)', () => {
    const steps = timelineFromLogs([], pkg);
    expect(steps).toHaveLength(1);
    expect(steps[0].label).toBe('Registrado');
    expect(steps[0].location).toBe('La Paz → Oruro');
    expect(JSON.stringify(steps)).not.toMatch(/19 Mar|Recolectado|Centro de distribución/);
  });
  it('sin historial ni paquete no hay pasos, y los eventos sin estado se ignoran', () => {
    expect(timelineFromLogs([], null)).toEqual([]);
    expect(timelineFromLogs([{ timestamp: 'x' }, null], pkg)).toHaveLength(1);
  });
});
