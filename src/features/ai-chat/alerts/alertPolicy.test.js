import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PREFS, HOUR, MIN_GAP_MS, SEEN_MS, SNOOZE_MS, isRelevantPath, markShown, markSnoozed, muteType, pickAlert, setEnabled,
} from './alertPolicy';

const NOW = 1_800_000_000_000;
const assign = { id: 'assign:aaa', type: 'assign', severity: 'medium', text: '2 paquetes…' };
const delayed = { id: 'delayed:bbb', type: 'delayed', severity: 'high', text: 'Un viaje no salió' };
const pick = (over = {}) => pickAlert({ alerts: [delayed, assign], prefs: DEFAULT_PREFS, now: NOW, pathname: '/dashboard', ...over });

describe('pickAlert: cuándo se muestra un aviso', () => {
  it('muestra el más urgente que corresponde a la pantalla', () => {
    expect(pick().id).toBe('delayed:bbb');
  });

  it('atado a lo que se mira: un aviso de paquetes sueltos no sale en Tracking', () => {
    expect(pick({ alerts: [assign], pathname: '/tracking' })).toBeNull();
    expect(pick({ alerts: [assign], pathname: '/logistics/packages' }).id).toBe('assign:aaa');
    expect(isRelevantPath('delayed', '/tracking')).toBe(true);
    expect(isRelevantPath('desconocido', '/dashboard')).toBe(false);
  });

  it('frecuencia: como máximo uno por hora', () => {
    const prefs = markShown(DEFAULT_PREFS, delayed, NOW);
    expect(pick({ prefs, now: NOW + MIN_GAP_MS - 1 })).toBeNull();
    // pasada la hora sale el siguiente (el anterior ya se vio y no se repite en 24 h)
    expect(pick({ prefs, now: NOW + MIN_GAP_MS + 1 }).id).toBe('assign:aaa');
  });

  it('no repite el mismo aviso en 24 horas, atendido o no; después sí puede volver', () => {
    const prefs = { ...markShown(DEFAULT_PREFS, delayed, NOW), lastShownAt: 0 };
    expect(pick({ alerts: [delayed], prefs, now: NOW + SEEN_MS - 1 })).toBeNull();
    expect(pick({ alerts: [delayed], prefs, now: NOW + SEEN_MS + 1 }).id).toBe('delayed:bbb');
  });

  it('«Después» lo pospone una hora', () => {
    const prefs = markSnoozed(DEFAULT_PREFS, delayed, NOW);
    expect(prefs.snoozed['delayed:bbb']).toBe(NOW + SNOOZE_MS);
    expect(pick({ alerts: [delayed], prefs, now: NOW + HOUR - 1 })).toBeNull();
    expect(pick({ alerts: [delayed], prefs, now: NOW + HOUR + 1 }).id).toBe('delayed:bbb');
  });

  it('«No mostrar este tipo» lo silencia por completo y el interruptor general lo apaga todo', () => {
    const muted = muteType(DEFAULT_PREFS, 'delayed');
    expect(pick({ prefs: muted }).id).toBe('assign:aaa');
    expect(pick({ prefs: setEnabled(DEFAULT_PREFS, false) })).toBeNull();
    // volver a activar los avisos también rehabilita los tipos silenciados
    expect(setEnabled({ ...muted, enabled: false }, true).mutedTypes).toEqual([]);
  });

  it('sin avisos no hay nada que mostrar', () => {
    expect(pick({ alerts: [] })).toBeNull();
  });
});

describe('preferencias: no crecen sin límite', () => {
  it('al marcar uno nuevo se olvidan los avisos vistos hace más de 24 h', () => {
    const old = { ...DEFAULT_PREFS, seen: { viejo: NOW - SEEN_MS - 1, reciente: NOW - 1000 } };
    const next = markShown(old, assign, NOW);
    expect(Object.keys(next.seen).sort()).toEqual(['assign:aaa', 'reciente']);
  });

  it('muteType no duplica', () => {
    const once = muteType(DEFAULT_PREFS, 'assign');
    expect(muteType(once, 'assign').mutedTypes).toEqual(['assign']);
  });
});
