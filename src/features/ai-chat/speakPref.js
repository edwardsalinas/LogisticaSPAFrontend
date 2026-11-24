import { useSyncExternalStore } from 'react';

/**
 * Preferencia "leer las respuestas en voz alta", compartida entre el panel del asistente, la pantalla del Modo IA y Logi.
 * Vive en localStorage (se recuerda entre visitas) y avisa a todos los que la usan cuando cambia.
 */
const KEY = 'logistica:ai-speak-replies';
const listeners = new Set();

const readStored = () => {
  try { return window.localStorage.getItem(KEY) === '1'; } catch { return null; }
};
let memory = readStored() ?? false; // respaldo si el navegador no deja usar localStorage

export const getSpeakPref = () => {
  const stored = readStored();
  return stored ?? memory;
};

export const setSpeakPref = (on) => {
  memory = Boolean(on);
  try { window.localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* sin almacenamiento: queda en memoria */ }
  listeners.forEach((notify) => notify());
};

const subscribe = (notify) => {
  listeners.add(notify);
  const onStorage = (e) => { if (e.key === KEY) notify(); }; // otra pestaña la cambió
  window.addEventListener('storage', onStorage);
  return () => { listeners.delete(notify); window.removeEventListener('storage', onStorage); };
};

export const useSpeakPref = () => [useSyncExternalStore(subscribe, getSpeakPref, () => false), setSpeakPref];
