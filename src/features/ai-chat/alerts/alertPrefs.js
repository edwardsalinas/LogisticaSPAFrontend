import { useSyncExternalStore } from 'react';
import { DEFAULT_PREFS, readPrefs, writePrefs } from './alertPolicy';

/**
 * Almacén compartido de las preferencias de avisos: Logi (que los muestra) y el chat (que tiene el interruptor) leen y
 * escriben lo mismo, así que siempre coinciden. Se guarda en localStorage (se recuerda entre visitas).
 */
const listeners = new Set();
let cache = null;

export const getPrefs = () => (cache ??= readPrefs());

export const savePrefs = (next) => {
  cache = writePrefs(next);
  listeners.forEach((notify) => notify());
  return cache;
};

const subscribe = (notify) => {
  listeners.add(notify);
  const onStorage = (e) => { if (e.key === 'logisticaspa:logi:avisos') { cache = null; notify(); } }; // otra pestaña lo cambió
  window.addEventListener('storage', onStorage);
  return () => { listeners.delete(notify); window.removeEventListener('storage', onStorage); };
};

export const useAlertPrefs = () => useSyncExternalStore(subscribe, getPrefs, () => DEFAULT_PREFS);

/** Solo para pruebas: vuelve a leer del almacenamiento. */
export const _resetPrefsCache = () => { cache = null; };
