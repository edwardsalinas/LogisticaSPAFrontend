/**
 * Política de los avisos proactivos de Logi: CUÁNDO se muestra uno. Es lo que separa a un asistente útil de Clippy:
 * pocos avisos, atados a lo que la persona está mirando, sin repetirse y siempre descartables o silenciables.
 * Son funciones puras sobre un objeto de preferencias (se guarda en localStorage aparte, ver abajo).
 */
export const HOUR = 60 * 60 * 1000;
export const MIN_GAP_MS = HOUR; // como máximo un aviso por hora
export const SNOOZE_MS = HOUR; // «Después» lo pospone una hora
export const SEEN_MS = 24 * HOUR; // un mismo aviso no vuelve a salir en 24 horas (lo hayan atendido o no)
export const SHOW_DELAY_MS = 4000; // se espera a que la persona se asiente en la pantalla antes de aparecer

/** En qué pantallas tiene sentido cada tipo de aviso (atado a lo que se está mirando). */
export const RELEVANT_PATHS = {
  assign: ['/', '/dashboard', '/logistics/packages', '/logistics/routes'],
  delayed: ['/', '/dashboard', '/logistics/routes', '/tracking'],
  no_driver: ['/', '/dashboard', '/logistics/routes'],
};

export const DEFAULT_PREFS = { enabled: true, mutedTypes: [], snoozed: {}, seen: {}, lastShownAt: 0 };

const KEY = 'logisticaspa:logi:avisos';

export const readPrefs = () => {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : { ...DEFAULT_PREFS };
  } catch {
    return { ...DEFAULT_PREFS };
  }
};

export const writePrefs = (prefs) => {
  try { window.localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* sin almacenamiento: vale solo mientras la pestaña viva */ }
  return prefs;
};

export const isRelevantPath = (type, pathname) => (RELEVANT_PATHS[type] ?? []).includes(pathname);

/** El primer aviso (ya vienen ordenados por urgencia) que se puede mostrar ahora, o null. */
export const pickAlert = ({ alerts = [], prefs = DEFAULT_PREFS, now = Date.now(), pathname = '/' }) => {
  if (!prefs.enabled) return null;
  if (now - (prefs.lastShownAt || 0) < MIN_GAP_MS) return null; // frecuencia: uno por hora
  return alerts.find((a) => (
    !prefs.mutedTypes.includes(a.type)
    && isRelevantPath(a.type, pathname)
    && !(prefs.snoozed[a.id] > now)
    && !(now - (prefs.seen[a.id] || 0) < SEEN_MS)
  )) ?? null;
};

const withoutOld = (map, now, ttl) => Object.fromEntries(Object.entries(map).filter(([, t]) => now - t < ttl));

/** Se mostró un aviso: se anota (frecuencia y no repetirlo). */
export const markShown = (prefs, alert, now = Date.now()) => ({
  ...prefs,
  lastShownAt: now,
  seen: { ...withoutOld(prefs.seen, now, SEEN_MS), [alert.id]: now },
});

/** «Después»: se pospone una hora. */
export const markSnoozed = (prefs, alert, now = Date.now()) => ({
  ...prefs,
  snoozed: { ...Object.fromEntries(Object.entries(prefs.snoozed).filter(([, until]) => until > now)), [alert.id]: now + SNOOZE_MS },
});

/** «No mostrar este tipo»: ese tipo de aviso no vuelve a salir. */
export const muteType = (prefs, type) => (prefs.mutedTypes.includes(type) ? prefs : { ...prefs, mutedTypes: [...prefs.mutedTypes, type] });

/** Interruptor general de avisos (y para volver a activar los tipos silenciados). */
export const setEnabled = (prefs, enabled) => ({ ...prefs, enabled, ...(enabled ? { mutedTypes: [] } : {}) });
