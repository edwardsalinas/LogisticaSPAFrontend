import { useSyncExternalStore } from 'react';

/**
 * El chat de voz vive en el layout (VoiceHost), no dentro del panel del chat: así puede quedarse abierto mientras Logi se
 * mueve por la pantalla y el panel se cierra. Este almacén dice si está abierto y permite abrirlo desde cualquier botón
 * (el micrófono del chat). Si no hay anfitrión (pantallas sueltas, pruebas), el botón abre el chat de voz como siempre.
 */
let state = { open: false, initial: '', wake: false };
let hosts = 0;
const listeners = new Set();
const set = (next) => { state = next; listeners.forEach((l) => l()); };

export const voiceDock = {
  hasHost: () => hosts > 0,
  registerHost: () => { hosts += 1; return () => { hosts -= 1; }; },
  // initial: lo que ya se dijo tras «hey Logi» (se atiende al abrir); wake: se abrió por la frase de activación
  open: ({ initial = '', wake = false } = {}) => set({ open: true, initial, wake }),
  close: () => set({ open: false, initial: '', wake: false }),
};

const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
export const useVoiceDock = () => useSyncExternalStore(subscribe, () => state, () => state);
