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

// ---- órdenes de voz: «muéstrame los paquetes entregados» pide a la pantalla que cambie de pestaña
const TAB_EVENT = 'logi:pestana';
// dónde recuerda cada pantalla su pestaña (usePersistentState, por pestaña del navegador): así, si la pantalla aún no está abierta,
// al abrirse ya empieza en la pedida
const TAB_STORAGE = { packages: 'logisticaspa:filtros:paquetes:pestana', fleet: 'logisticaspa:filtros:flota:pestana', routes: 'logisticaspa:filtros:viajes:vista' };

export const requestTab = (page, value) => {
  try { if (TAB_STORAGE[page]) window.sessionStorage.setItem(TAB_STORAGE[page], JSON.stringify(value)); } catch { /* sin almacenamiento */ }
  window.dispatchEvent(new CustomEvent(TAB_EVENT, { detail: { page, value } })); // si ya está abierta, cambia al momento
};

/** Para las pantallas con pestañas: atiende los pedidos de cambio de pestaña (de las órdenes de voz). */
export function useTabRequests(page, setTab, allowed) {
  useEffect(() => {
    const onRequest = (e) => { if (e.detail?.page === page && allowed.includes(e.detail.value)) setTab(e.detail.value); };
    window.addEventListener(TAB_EVENT, onRequest);
    return () => window.removeEventListener(TAB_EVENT, onRequest);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setTab y allowed son estables
  }, [page]);
}

// ---- «muéstrame lo que acabas de hacer»: la pantalla se filtra con lo que se pide (un código de rastreo)
const SEARCH_EVENT = 'logi:busqueda';
// dónde guarda cada pantalla su búsqueda (usePersistentState): si aún no está abierta, al abrirse ya empieza filtrada
const SEARCH_STORAGE = {
  packages: 'logisticaspa:filtros:paquetes:busqueda',
  routes: 'logisticaspa:filtros:viajes:busqueda',
  fleet: 'logisticaspa:filtros:flota:busqueda',
  tracking: 'logisticaspa:filtros:rastreo:busqueda',
};

/** Pide a una pantalla con buscador que se filtre por este texto (y siempre en su pestaña principal). Si aún no está abierta, empieza ya filtrada. */
export const requestSearch = (page, text) => {
  try { if (SEARCH_STORAGE[page]) window.sessionStorage.setItem(SEARCH_STORAGE[page], JSON.stringify(String(text ?? ''))); } catch { /* sin almacenamiento */ }
  if (page === 'packages') requestTab('packages', 'all');
  // la búsqueda de Viajes solo se aplica a la lista, no al calendario
  if (page === 'routes' && text) requestTab('routes', 'list');
  window.dispatchEvent(new CustomEvent(SEARCH_EVENT, { detail: { page, text: String(text ?? '') } }));
};

/** Para las pantallas con buscador: atiende los pedidos de filtro. */
export function useSearchRequests(page, setSearch) {
  useEffect(() => {
    const onRequest = (e) => { if (e.detail?.page === page) setSearch(e.detail.text); };
    window.addEventListener(SEARCH_EVENT, onRequest);
    return () => window.removeEventListener(SEARCH_EVENT, onRequest);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setSearch es estable
  }, [page]);
}

// ---- filtros finos de una pantalla: la fecha de Paquetes, el rango de Reportes, origen/destino/tipo de Viajes
const FIELD_EVENT = 'logi:campo';
const FIELD_STORAGE = {
  'packages.date': 'logisticaspa:filtros:paquetes:fecha',
  'analytics.range': 'logisticaspa:filtros:reportes:rango',
  'routes.origin': 'logisticaspa:filtros:viajes:origen',
  'routes.destination': 'logisticaspa:filtros:viajes:destino',
  'routes.type': 'logisticaspa:filtros:viajes:tipo',
};

/** Pide a una pantalla que ponga un filtro (campo) en un valor. Si aún no está abierta, lo recuerda y empieza ya filtrada. */
export const requestField = (page, field, value) => {
  const key = FIELD_STORAGE[`${page}.${field}`];
  if (!key) return false;
  try { window.sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* sin almacenamiento */ }
  if (page === 'packages' && field === 'date') requestTab('packages', 'all'); // la fecha solo se ve en el tablero de operaciones
  if (page === 'routes' && value) requestTab('routes', 'list');
  window.dispatchEvent(new CustomEvent(FIELD_EVENT, { detail: { page, field, value } }));
  return true;
};

/** Lo que una pantalla tenía pedido antes de abrirse (o null): para arrancar ya filtrada. */
export const takeRequestedField = (page, field) => {
  const key = FIELD_STORAGE[`${page}.${field}`];
  try { const raw = key && window.sessionStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; }
};

/** Para las pantallas con filtros finos: handlers = { campo: (valor) => … }. */
export function useFieldRequests(page, handlers) {
  useEffect(() => {
    const onRequest = (e) => { if (e.detail?.page === page) handlers[e.detail.field]?.(e.detail.value); };
    window.addEventListener(FIELD_EVENT, onRequest);
    return () => window.removeEventListener(FIELD_EVENT, onRequest);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- los setters son estables
  }, [page]);
}

// el último paquete que el formulario registró: la ayuda por voz lo usa para enseñarlo en la tabla
let lastCreated = null;
export const noteCreatedPackage = (pkg) => { lastCreated = pkg?.tracking_code ? String(pkg.tracking_code) : null; };
export const takeCreatedPackage = () => { const c = lastCreated; lastCreated = null; return c; };

// ---- lo que la pantalla tiene puesto y a la vista: filtros y filas (para «bórrame el filtro», «¿cuántos hay?»)
let screenState = null; // { filters: { search, date, … }, visible: { count, codes } }
const sameState = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Para las pantallas con tabla: informa sus filtros y lo que muestra. Se retira al salir. */
export function useRegisterScreenState(state) {
  const key = JSON.stringify(state ?? null);
  useEffect(() => {
    const next = JSON.parse(key);
    if (!sameState(screenState, next)) screenState = next;
    return () => { screenState = null; };
  }, [key]);
}
export const getScreenState = () => screenState;

/** El contexto que viaja con cada consulta al asistente. */
export const buildChatContext = () => {
  const path = typeof window === 'undefined' ? '' : window.location.pathname;
  const filters = Object.fromEntries(Object.entries(screenState?.filters ?? {}).filter(([, v]) => (typeof v === 'string' ? v.trim() : v)));
  return {
    path,
    ...(entity ? { entity } : {}),
    ...(view ? { view } : {}),
    ...(Object.keys(filters).length ? { filters } : {}),
    ...(screenState?.visible ? { visible: screenState.visible } : {}),
  };
};
