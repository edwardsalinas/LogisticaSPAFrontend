import { vi } from 'vitest';

/** Reconocimiento de voz simulado: la prueba decide qué "dice" el usuario y cuándo termina. */
export class FakeRecognition {
  static instances = [];
  constructor() {
    this.started = false;
    FakeRecognition.instances.push(this);
  }
  start() { this.started = true; }
  stop() { this.finish(); }
  abort() { this.finish(); }
  /** El usuario dice algo (parcial o definitivo). */
  say(text, { final = true } = {}) {
    this.onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript: text }], { isFinal: final })] });
  }
  /** El navegador termina de escuchar. */
  finish() {
    if (!this.started) return;
    this.started = false;
    this.onend?.();
  }
  fail(error) { this.onerror?.({ error }); this.finish(); }
  static get last() { return FakeRecognition.instances.at(-1); }
}

/** Instala el reconocimiento y la síntesis simulados en window. Devuelve lo que "se dijo en voz alta". */
export const installSpeech = ({ recognition = true, synthesis = true, autoEnd = true } = {}) => {
  FakeRecognition.instances = [];
  const spoken = [];
  delete window.SpeechRecognition;
  delete window.webkitSpeechRecognition;
  if (recognition) window.webkitSpeechRecognition = FakeRecognition;
  if (synthesis) {
    window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
    window.speechSynthesis = {
      speak: vi.fn((u) => { spoken.push(u); if (autoEnd) setTimeout(() => u.onend?.(), 0); }),
      cancel: vi.fn(),
      getVoices: () => [{ lang: 'en-US', name: 'Ingles' }, { lang: 'es-MX', name: 'Espanol MX' }],
      addEventListener: () => {},
      removeEventListener: () => {},
    };
  } else {
    delete window.speechSynthesis;
    delete window.SpeechSynthesisUtterance;
  }
  return { spoken };
};

export const uninstallSpeech = () => {
  FakeRecognition.instances = [];
  delete window.SpeechRecognition;
  delete window.webkitSpeechRecognition;
  delete window.speechSynthesis;
  delete window.SpeechSynthesisUtterance;
};
