import { useEffect, useSyncExternalStore } from 'react';

/**
 * El chat de voz vive en el layout (VoiceHost), no dentro del panel del chat: así puede quedarse abierto mientras Logi se
 * mueve por la pantalla y el panel se cierra. Este almacén dice si está abierto y permite abrirlo desde cualquier botón
 * (el micrófono del chat). Si no hay anfitrión (pantallas sueltas, pruebas), el botón abre el chat de voz como siempre.
 *
 * La voz NO tiene ventana propia: el motor (VoiceMode) publica aquí su estado (qué fase, qué oye, la boca, la confirmación
 * pendiente) y quien esté a la vista lo muestra: el encabezado del chat (con el Logi animado) o el globo de Logi cuando el
 * chat está cerrado. Mientras nadie lo presente (pruebas, pantallas sueltas) el motor dibuja su tarjeta de siempre.
 */
let state = { open: false, initial: '', wake: false };
let hosts = 0;
const listeners = new Set();
const set = (next) => { state = next; listeners.forEach((l) => l()); };

let ui = { live: null, presenters: 0 };
const uiListeners = new Set();
const setUi = (next) => { ui = next; uiListeners.forEach((l) => l()); };

const sameLive = (a, b) => {
  if (a === b) return true;
  if (!a || !b) return false;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if (k === 'pending') { if ((a.pending?.id ?? null) !== (b.pending?.id ?? null)) return false; } else if (a[k] !== b[k]) return false;
  }
  return true;
};

export const voiceDock = {
  hasHost: () => hosts > 0,
  registerHost: () => { hosts += 1; return () => { hosts -= 1; }; },
  // initial: lo que ya se dijo tras «hey Logi» (se atiende al abrir); wake: se abrió por la frase de activación
  open: ({ initial = '', wake = false } = {}) => set({ open: true, initial, wake }),
  close: () => { setUi({ ...ui, live: null }); set({ open: false, initial: '', wake: false }); },
  // el motor de voz publica su estado (null al terminar); controls es un objeto estable con las acciones
  publish: (live) => { if (!sameLive(ui.live, live)) setUi({ ...ui, live }); },
  registerPresenter: () => { setUi({ ...ui, presenters: ui.presenters + 1 }); return () => setUi({ ...ui, presenters: ui.presenters - 1 }); },
};

const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
export const useVoiceDock = () => useSyncExternalStore(subscribe, () => state, () => state);

const subscribeUi = (l) => { uiListeners.add(l); return () => uiListeners.delete(l); };
const getUi = () => ui;
/** { live, presenters }: el estado de la voz y cuántos lugares a la vista lo están mostrando. */
export const useVoiceUi = () => useSyncExternalStore(subscribeUi, getUi, getUi);

/** Quien muestra la voz (el chat abierto, o Logi en pantalla) se anota mientras está a la vista. */
export const useVoicePresenter = (visible = true) => {
  useEffect(() => (visible ? voiceDock.registerPresenter() : undefined), [visible]);
};

/** Solo para pruebas. */
export const _resetVoiceDock = () => { hosts = 0; state = { open: false, initial: '', wake: false }; ui = { live: null, presenters: 0 }; };
