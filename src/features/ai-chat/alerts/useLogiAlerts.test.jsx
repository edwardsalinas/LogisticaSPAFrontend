import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useLogiAlerts from './useLogiAlerts';
import { _resetPrefsCache, getPrefs } from './alertPrefs';
import { SHOW_DELAY_MS } from './alertPolicy';
import apiService from '../../../services/apiService';

vi.mock('../../../services/apiService', () => ({ default: { getLogiAlerts: vi.fn(), trackLogiEvent: vi.fn() } }));

const DELAYED = { id: 'delayed:1', type: 'delayed', severity: 'high', title: 'Un viaje no ha salido', text: 'x', action: { kind: 'navigate', to: '/logistics/routes' } };
const ASSIGN = { id: 'assign:1', type: 'assign', severity: 'medium', title: 'Paquetes sueltos', text: 'y', action: { kind: 'prepare_assign', route_ref: 'RT-1', codes: ['A'] } };

const flush = async (ms = 0) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };
const events = () => apiService.trackLogiEvent.mock.calls.map((c) => c[0]);
// primero llega la respuesta del servidor (si no, el aviso se programa DESPUÉS del salto de reloj y nunca se ve)
const setup = async (props = {}) => {
  const hook = renderHook((p) => useLogiAlerts(p), { initialProps: { allowed: true, pathname: '/dashboard', busy: false, ...props } });
  await flush(0);
  return hook;
};

describe('useLogiAlerts: avisos proactivos con disciplina', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear(); _resetPrefsCache();
    apiService.getLogiAlerts.mockReset(); apiService.trackLogiEvent.mockReset();
    apiService.getLogiAlerts.mockResolvedValue({ data: [DELAYED, ASSIGN] });
  });
  // los hooks de pruebas anteriores NO deben seguir montados: compartirían las preferencias y se «gastarían» el aviso
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it('muestra el más urgente DESPUÉS de unos segundos (la persona primero se asienta) y lo anota en las métricas', async () => {
    const { result } = await setup();
    await flush(0);
    expect(result.current.alert).toBeNull();
    await flush(SHOW_DELAY_MS + 50);
    expect(result.current.alert.id).toBe('delayed:1');
    expect(events()).toEqual([{ event: 'alert_shown', type: 'delayed' }]);
  });

  it('solo para personal: sin permiso (cliente, conductor) no pide ni muestra nada', async () => {
    const { result } = await setup({ allowed: false });
    await flush(SHOW_DELAY_MS + 50);
    expect(apiService.getLogiAlerts).not.toHaveBeenCalled();
    expect(result.current.alert).toBeNull();
  });

  it('atado a la pantalla: en Tracking no sale un aviso de paquetes sueltos (pero sí el de retraso)', async () => {
    apiService.getLogiAlerts.mockResolvedValue({ data: [ASSIGN] });
    const { result } = await setup({ pathname: '/tracking' });
    await flush(SHOW_DELAY_MS + 50);
    expect(result.current.alert).toBeNull();
  });

  it('si Logi o el chat están ocupados, no aparece; y un aviso visible se retira al ocuparse', async () => {
    const { result, rerender } = await setup({ busy: true });
    await flush(SHOW_DELAY_MS + 50);
    expect(result.current.alert).toBeNull();
    rerender({ allowed: true, pathname: '/dashboard', busy: false });
    await flush(SHOW_DELAY_MS + 50);
    expect(result.current.alert).not.toBeNull();
    rerender({ allowed: true, pathname: '/dashboard', busy: true });
    await flush(0);
    expect(result.current.alert).toBeNull();
  });

  it('un aviso sin atender se recoge solo a los 45 segundos', async () => {
    const { result } = await setup();
    await flush(SHOW_DELAY_MS + 50);
    expect(result.current.alert).not.toBeNull();
    await flush(45_000);
    expect(result.current.alert).toBeNull();
  });

  it('«Después» lo pospone y se anota; «No mostrar este tipo» lo silencia para siempre', async () => {
    const { result } = await setup();
    await flush(SHOW_DELAY_MS + 50);
    act(() => result.current.snooze(result.current.alert));
    expect(result.current.alert).toBeNull();
    expect(events().at(-1)).toEqual({ event: 'alert_snoozed', type: 'delayed' });
    expect(getPrefs().snoozed['delayed:1']).toBeGreaterThan(Date.now());

    // pasada la hora sale el siguiente (se reevalúa en la siguiente revisión de avisos, cada 5 minutos); se silencia su tipo
    await flush(60 * 60 * 1000 + 5 * 60 * 1000); // llega la revisión de avisos…
    await flush(SHOW_DELAY_MS + 100); // …y tras unos segundos aparece
    const shown = result.current.alert;
    expect(shown.id).toBe('assign:1');
    act(() => result.current.mute(shown));
    expect(events().at(-1)).toEqual({ event: 'alert_muted', type: 'assign' });
    expect(getPrefs().mutedTypes).toEqual(['assign']);
  });

  it('el interruptor general apaga todo y se recuerda', async () => {
    const { result } = await setup();
    act(() => result.current.setEnabled(false));
    await flush(SHOW_DELAY_MS + 50);
    expect(result.current.enabled).toBe(false);
    expect(result.current.alert).toBeNull();
    expect(JSON.parse(window.localStorage.getItem('logisticaspa:logi:avisos')).enabled).toBe(false);
  });

  it('si el servidor falla, no hay avisos y nada se rompe', async () => {
    apiService.getLogiAlerts.mockRejectedValue(new Error('caída'));
    const { result } = await setup();
    await flush(SHOW_DELAY_MS + 50);
    expect(result.current.alert).toBeNull();
  });
});
