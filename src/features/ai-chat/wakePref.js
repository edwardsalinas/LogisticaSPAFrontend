import { useSyncExternalStore } from 'react';

/**
 * ¿Está activado «Hey Logi»? Es una elección de la persona y viene APAGADO: activarlo deja el micrófono abierto mientras la
 * pestaña esté a la vista. Se recuerda solo mientras dure la pestaña (sessionStorage): al volver otro día hay que encenderlo
 * de nuevo, así el micrófono nunca queda abierto por un olvido. Lo leen el interruptor del chat y el aviso de micrófono.
 */
const KEY = 'logisticaspa:logi:hey-logi';
const listeners = new Set();

const read = () => {
  try { return window.sessionStorage.getItem(KEY) === '1'; } catch { return false; }
};
let current = null;

export const getWakeEnabled = () => (current ??= read());

export const setWakeEnabled = (on) => {
  current = Boolean(on);
  try { if (current) window.sessionStorage.setItem(KEY, '1'); else window.sessionStorage.removeItem(KEY); } catch { /* sin almacenamiento: solo dura en memoria */ }
  listeners.forEach((l) => l());
};

const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
export const useWakeEnabled = () => useSyncExternalStore(subscribe, getWakeEnabled, () => false);

/** Solo para pruebas. */
export const _resetWakePref = () => { current = null; };
