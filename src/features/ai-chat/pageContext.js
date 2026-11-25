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
const listeners = new Set();

const same = (a, b) => (a === b) || (a && b && a.type === b.type && a.ref === b.ref);
export const setPageEntity = (next) => {
  const clean = next?.type && next?.ref ? { type: next.type, ref: String(next.ref) } : null;
  if (same(entity, clean)) return;
  entity = clean;
  listeners.forEach((l) => l());
};
export const getPageEntity = () => entity;

const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
export const usePageEntity = () => useSyncExternalStore(subscribe, getPageEntity, () => null);

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

/** El contexto que viaja con cada consulta al asistente. */
export const buildChatContext = () => {
  const path = typeof window === 'undefined' ? '' : window.location.pathname;
  return { path, ...(entity ? { entity } : {}) };
};
