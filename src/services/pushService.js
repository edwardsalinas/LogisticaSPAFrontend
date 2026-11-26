import apiService from './apiService';

/**
 * Avisos de Logi con la pestaña cerrada (Web Push). Voluntarios: se activan con un botón, y el permiso del navegador se pide SOLO en
 * ese momento (nunca al cargar la página). Necesita https (o localhost) y que el servidor tenga las claves configuradas.
 *
 * Estados de `status()`:
 *  - 'unsupported': este navegador no puede (por ejemplo, Safari en iPhone sin instalar la aplicación);
 *  - 'unavailable': el servidor no los ofrece (faltan claves o la tabla);
 *  - 'denied': la persona bloqueó las notificaciones en el navegador (solo ella puede cambiarlo, desde la barra de direcciones);
 *  - 'off' / 'on': disponibles, apagados o encendidos en este navegador.
 */
export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

/** La clave pública llega en base64 de URL; el navegador la pide como bytes. */
export const urlBase64ToUint8Array = (base64) => {
  const padded = `${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

const registration = async () => navigator.serviceWorker.getRegistration('/').then((r) => r ?? null);

export const serverConfig = async () => {
  try {
    const res = await apiService.getPushConfig();
    return res?.data?.data ?? res?.data ?? { enabled: false };
  } catch {
    return { enabled: false };
  }
};

export const pushStatus = async () => {
  if (!pushSupported()) return 'unsupported';
  const cfg = await serverConfig();
  if (!cfg.enabled) return 'unavailable';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await registration();
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  return sub && Notification.permission === 'granted' ? 'on' : 'off';
};

/** Activa los avisos en este navegador. Devuelve el estado final; nunca lanza (la pantalla solo muestra el estado). */
export const enablePush = async () => {
  if (!pushSupported()) return 'unsupported';
  const cfg = await serverConfig();
  if (!cfg.enabled || !cfg.publicKey) return 'unavailable';
  const permission = await Notification.requestPermission(); // el único lugar donde se pide, y solo tras un clic
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off';
  try {
    const reg = (await registration()) ?? (await navigator.serviceWorker.ready);
    const existing = await reg.pushManager.getSubscription();
    const sub = existing ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(cfg.publicKey) }));
    await apiService.subscribePush(sub.toJSON());
    return 'on';
  } catch {
    return 'off';
  }
};

export const disablePush = async () => {
  if (!pushSupported()) return 'unsupported';
  try {
    const reg = await registration();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (sub) {
      const { endpoint } = sub;
      await sub.unsubscribe();
      await apiService.unsubscribePush({ endpoint }).catch(() => {}); // si falla, el servidor la borra solo al ver que el navegador ya no la acepta
    }
  } catch {
    /* sin suscripción que quitar */
  }
  return Notification.permission === 'denied' ? 'denied' : 'off';
};
