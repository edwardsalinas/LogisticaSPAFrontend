import { useEffect, useSyncExternalStore } from 'react';

/**
 * Qué está viendo la persona, para que el asistente entienda «este paquete», «aquí» o «esto». Las pantallas que muestran un
 * paquete o un viaje lo registran (useRegisterPageEntity) y lo retiran al salir. Al hablar con el asistente se envía junto a la
 * ruta actual; el servidor lo valida contra una lista cerrada y lo trata como una pista, nunca como una orden ni como un permiso.
 *
 * Solo se registra un elemento REAL: los datos de ejemplo de una pantalla (cuando no se pudo cargar el paquete) nunca deben llegar
 * al asistente como si la persona estuviera viendo ese paquete.
 */
let entity = null;
let view = null; // pestaña abierta: { tab } (el servidor solo acepta las de cada pantalla)
const listeners = new Set();

const same = (a, b) => (a === b) || (a && b && a.type === b.type && a.ref === b.ref);
export const setPageEntity = (next) => {
  const clean = next?.type && next?.ref ? { type: next.type, ref: String(next.ref) } : null;
  if (same(entity, clean)) return;
  entity = clean;
  listeners.forEach((l) => l());
};
export const getPageEntity = () => entity;

export const setPageView = (next) => {
  const clean = next?.tab ? { tab: String(next.tab) } : null;
  if ((view === null && clean === null) || (view && clean && view.tab === clean.tab)) return;
  view = clean;
  listeners.forEach((l) => l());
};
export const getPageView = () => view;

const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
export const usePageEntity = () => useSyncExternalStore(subscribe, getPageEntity, () => null);
export const usePageView = () => useSyncExternalStore(subscribe, getPageView, () => null);

/** Para las pantallas de un paquete o un viaje: `{ type: 'package' | 'route', ref }` o null mientras no hay uno real. */
export function useRegisterPageEntity(next) {
  const type = next?.type ?? null;
  const ref = next?.ref ?? null;
  useEffect(() => {
    if (!type || !ref) { setPageEntity(null); return undefined; }
    setPageEntity({ type, ref });
    return () => setPageEntity(null);
  }, [type, ref]);
}

/** Para las pantallas con pestañas (paquetes: «all» u «delivered»; flota: «vehicles» o «drivers»). */
export function useRegisterPageView(tab) {
  useEffect(() => {
    if (!tab) { setPageView(null); return undefined; }
    setPageView({ tab });
    return () => setPageView(null);
  }, [tab]);
}

/** El contexto que viaja con cada consulta al asistente. */
export const buildChatContext = () => {
  const path = typeof window === 'undefined' ? '' : window.location.pathname;
  return { path, ...(entity ? { entity } : {}), ...(view ? { view } : {}) };
};
