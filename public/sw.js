/* Service worker de LogisticaSPA.
 *
 * Función: vaciar la cola offline de puntos GPS con Background Sync, incluso si la pestaña del
 * conductor quedó en segundo plano. La cola se guarda en IndexedDB (src/services/offlineQueue.js);
 * el nombre de la base y de los stores debe coincidir.
 *
 * Limitación: Background Sync no está disponible en todos los navegadores (por ejemplo Safari/iOS).
 * En ese caso la propia aplicación vacía la cola cuando vuelve la conexión (evento "online").
 */
const DB_NAME = 'logistica-offline';
const QUEUE_STORE = 'gps_queue';
const META_STORE = 'meta';
const SYNC_TAG = 'flush-gps-queue';
const BATCH_SIZE = 200;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

const openDb = () =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) db.createObjectStore(QUEUE_STORE, { autoIncrement: true });
      if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const readAll = (db) =>
  new Promise((resolve, reject) => {
    const items = [];
    const req = db.transaction(QUEUE_STORE, 'readonly').objectStore(QUEUE_STORE).openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) { items.push({ key: cursor.key, ...cursor.value }); cursor.continue(); } else resolve(items);
    };
    req.onerror = () => reject(req.error);
  });

const readMeta = (db, key) =>
  new Promise((resolve, reject) => {
    const req = db.transaction(META_STORE, 'readonly').objectStore(META_STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const removeKeys = (db, keys) =>
  new Promise((resolve, reject) => {
    if (!keys.length) return resolve();
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(QUEUE_STORE);
    keys.forEach((k) => store.delete(k));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

async function flushQueue() {
  const db = await openDb();
  try {
    const apiBase = await readMeta(db, 'apiBaseUrl');
    if (!apiBase) return; // la app aún no registró la URL de la API

    const items = await readAll(db);
    const byTrip = new Map();
    for (const item of items) {
      if (!byTrip.has(item.tripId)) byTrip.set(item.tripId, []);
      byTrip.get(item.tripId).push(item);
    }

    for (const [tripId, list] of byTrip) {
      list.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      for (let i = 0; i < list.length; i += BATCH_SIZE) {
        const chunk = list.slice(i, i + BATCH_SIZE);
        // Un error de red lanza excepción: el navegador reintenta el sync más tarde.
        const res = await fetch(`${apiBase}/tracking/trip/${encodeURIComponent(tripId)}/events/batch`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          body: JSON.stringify({
            points: chunk.map(({ lat, lng, status, timestamp }) => ({ lat, lng, status, timestamp })),
          }),
        });

        if (res.ok) {
          await removeKeys(db, chunk.map((c) => c.key));
          continue;
        }

        const body = await res.json().catch(() => ({}));
        const processed = body.processed || 0;
        if (processed > 0) await removeKeys(db, chunk.slice(0, processed).map((c) => c.key));

        const permanent = res.status >= 400 && res.status < 500 && res.status !== 401 && res.status !== 429;
        if (permanent) {
          await removeKeys(db, chunk.slice(processed).map((c) => c.key)); // lote inválido: no bloquear la cola
          continue;
        }
        // 401 (sesión vencida: la app renovará y vaciará), 429 o 5xx: reintentar luego
        throw new Error('Sync pendiente: HTTP ' + res.status);
      }
    }
  } finally {
    db.close();
  }
}

self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) event.waitUntil(flushQueue());
});
