/**
 * Cola offline de puntos GPS (IndexedDB).
 *
 * Cuando el dispositivo del conductor pierde conectividad, cada lectura GPS se guarda aquí con su
 * timestamp real y se envía en lote (POST /tracking/trip/:id/events/batch) al recuperar la señal.
 * El service worker (public/sw.js) puede vaciar la misma cola con Background Sync aunque la
 * pestaña esté en segundo plano. IMPORTANTE: el nombre de la base y de los stores debe coincidir
 * con el de public/sw.js.
 */
const DB_NAME = 'logistica-offline';
const DB_VERSION = 1;
const QUEUE_STORE = 'gps_queue';
const META_STORE = 'meta';
const BATCH_SIZE = 200; // máximo aceptado por el backend
export const SYNC_TAG = 'flush-gps-queue';

const openDb = () =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) db.createObjectStore(QUEUE_STORE, { autoIncrement: true });
      if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const run = async (store, mode, action) => {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(store, mode);
      const result = action(tx.objectStore(store));
      tx.oncomplete = () => resolve(result?.result ?? result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
};

/** Guarda un punto: { tripId, lat, lng, status, timestamp } */
export const enqueuePoint = (point) => run(QUEUE_STORE, 'readwrite', (s) => s.add(point));

/** Devuelve todos los puntos con su clave: [{ key, tripId, lat, lng, status, timestamp }] */
export const getQueuedPoints = async () => {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const items = [];
      const req = db.transaction(QUEUE_STORE, 'readonly').objectStore(QUEUE_STORE).openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          items.push({ key: cursor.key, ...cursor.value });
          cursor.continue();
        } else {
          resolve(items);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
};

export const removePoints = (keys) =>
  keys.length ? run(QUEUE_STORE, 'readwrite', (s) => keys.forEach((k) => s.delete(k))) : Promise.resolve();

export const countQueued = () => run(QUEUE_STORE, 'readonly', (s) => s.count());

/** Guarda datos que el service worker necesita (p. ej. la URL base de la API). */
export const saveMeta = (key, value) => run(META_STORE, 'readwrite', (s) => s.put(value, key));

/** Pide al service worker vaciar la cola cuando vuelva la red (Background Sync, si el navegador lo soporta). */
export const requestBackgroundSync = async () => {
  try {
    if (!('serviceWorker' in navigator)) return;
    const registration = await navigator.serviceWorker.ready;
    if ('sync' in registration) await registration.sync.register(SYNC_TAG);
  } catch {
    // Sin Background Sync: la app vacía la cola por sí misma al volver la conexión (evento "online").
  }
};

let flushing = false;

/**
 * Envía la cola al servidor, agrupada por viaje y en orden cronológico.
 * @param {(tripId: string, points: object[]) => Promise<{arrived?: boolean}>} sendBatch
 * @returns {Promise<{sent: number, remaining: number, arrived: boolean}>}
 *
 * - Error de red, 401, 429 o 5xx: se detiene y se conserva lo pendiente (se reintentará).
 * - Error 4xx definitivo (viaje inexistente o ajeno, payload inválido): se descarta ese lote para
 *   que no bloquee la cola.
 */
export const flushQueue = async (sendBatch) => {
  if (flushing) return { sent: 0, remaining: await countQueued(), arrived: false };
  flushing = true;
  let sent = 0;
  let arrived = false;

  try {
    const items = await getQueuedPoints();
    const byTrip = new Map();
    for (const item of items) {
      if (!byTrip.has(item.tripId)) byTrip.set(item.tripId, []);
      byTrip.get(item.tripId).push(item);
    }

    outer: for (const [tripId, list] of byTrip) {
      list.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      for (let i = 0; i < list.length; i += BATCH_SIZE) {
        const chunk = list.slice(i, i + BATCH_SIZE);
        try {
          const res = await sendBatch(
            tripId,
            chunk.map(({ lat, lng, status, timestamp }) => ({ lat, lng, status, timestamp }))
          );
          await removePoints(chunk.map((c) => c.key));
          sent += chunk.length;
          arrived = arrived || Boolean(res?.arrived);
        } catch (err) {
          const processed = err?.data?.processed || 0;
          if (processed > 0) {
            await removePoints(chunk.slice(0, processed).map((c) => c.key));
            sent += processed;
          }
          const status = err?.status;
          const permanent = status >= 400 && status < 500 && status !== 401 && status !== 429;
          if (permanent) {
            await removePoints(chunk.slice(processed).map((c) => c.key));
            continue;
          }
          break outer; // sin red / sesión vencida / servidor caído: reintentar luego
        }
      }
    }
  } finally {
    flushing = false;
  }

  return { sent, remaining: await countQueued(), arrived };
};
