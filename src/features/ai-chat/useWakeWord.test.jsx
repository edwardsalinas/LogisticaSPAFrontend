import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useWakeWord from './useWakeWord';

/** Micrófono simulado: guarda las instancias para «decir» frases y provocar el fin o un error. */
const instances = [];
class FakeSR {
  constructor() { this.started = false; instances.push(this); }
  start() { this.started = true; this.onstart?.(); }
  abort() { if (this.started) { this.started = false; this.onend?.(); } }
  say(text, isFinal = false) { this.onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript: text }], { isFinal })] }); }
  end() { this.started = false; this.onend?.(); }
}
const current = () => instances.at(-1);
const flush = async (ms = 0) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };

describe('useWakeWord: escuchar «hey Logi» con el micrófono abierto solo cuando corresponde', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    instances.length = 0;
    window.SpeechRecognition = FakeSR;
    window.webkitSpeechRecognition = FakeSR;
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); delete window.SpeechRecognition; delete window.webkitSpeechRecognition; });

  it('apagado (por defecto) NO abre el micrófono', () => {
    renderHook(() => useWakeWord({ enabled: false, onWake: vi.fn() }));
    expect(instances).toHaveLength(0);
  });

  it('activado abre una escucha continua; frases que no son «hey Logi» no hacen nada', async () => {
    const onWake = vi.fn();
    const { result } = renderHook(() => useWakeWord({ enabled: true, onWake }));
    expect(instances).toHaveLength(1);
    expect(current().continuous).toBe(true);
    expect(result.current.listening).toBe(true);
    act(() => current().say('buenas tardes a todos', true));
    act(() => current().say('abre la página de login', true));
    await flush(2000);
    expect(onWake).not.toHaveBeenCalled();
  });

  it('«hey Logi» sola: espera un instante por si sigue la orden y luego despierta con rest vacío', async () => {
    const onWake = vi.fn();
    renderHook(() => useWakeWord({ enabled: true, onWake }));
    act(() => current().say('hey logi'));
    expect(onWake).not.toHaveBeenCalled();
    await flush(950);
    expect(onWake).toHaveBeenCalledWith('');
  });

  it('«hey Logi, ayúdame a crear un paquete» (resultado final) despierta de inmediato con la orden', () => {
    const onWake = vi.fn();
    renderHook(() => useWakeWord({ enabled: true, onWake }));
    act(() => current().say('Hey Logi, ayúdame a crear un paquete', true));
    expect(onWake).toHaveBeenCalledWith('ayúdame a crear un paquete');
  });

  it('las palabras que siguen a una frase parcial reinician la espera y se conservan', async () => {
    const onWake = vi.fn();
    renderHook(() => useWakeWord({ enabled: true, onWake }));
    act(() => current().say('hey logi'));
    await flush(600);
    act(() => current().say('hey logi dime el estado'));
    await flush(600);
    expect(onWake).not.toHaveBeenCalled();
    await flush(400);
    expect(onWake).toHaveBeenCalledWith('dime el estado');
  });

  it('al despertar suelta el micrófono (el chat de voz lo necesita) y no se reinicia solo', async () => {
    renderHook(() => useWakeWord({ enabled: true, onWake: vi.fn() }));
    const first = current();
    act(() => first.say('hey logi', true));
    expect(first.started).toBe(false);
    await flush(5000);
    expect(instances).toHaveLength(1);
  });

  it('Chrome corta la escucha continua cada tanto: se reanuda sola, con espera creciente', async () => {
    renderHook(() => useWakeWord({ enabled: true, onWake: vi.fn() }));
    act(() => current().end());
    await flush(500);
    expect(instances).toHaveLength(2);
    act(() => current().end());
    await flush(500);
    expect(instances).toHaveLength(2); // la segunda espera es mayor
    await flush(500);
    expect(instances).toHaveLength(3);
  });

  it('pausado (chat de voz abierto, Logi trabajando) suelta el micrófono y lo retoma después', () => {
    const { rerender } = renderHook((p) => useWakeWord(p), { initialProps: { enabled: true, paused: false, onWake: vi.fn() } });
    const first = current();
    rerender({ enabled: true, paused: true, onWake: vi.fn() });
    expect(first.started).toBe(false);
    rerender({ enabled: true, paused: false, onWake: vi.fn() });
    expect(instances).toHaveLength(2);
    expect(current().started).toBe(true);
  });

  it('con la pestaña oculta no escucha', () => {
    const { rerender } = renderHook((p) => useWakeWord(p), { initialProps: { enabled: true, onWake: vi.fn() } });
    const first = current();
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    rerender({ enabled: true, onWake: vi.fn() });
    expect(first.started).toBe(false);
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(current().started).toBe(true);
  });

  it('un permiso denegado no se reintenta: avisa (onFatal) y se detiene', async () => {
    const onFatal = vi.fn();
    const { result } = renderHook(() => useWakeWord({ enabled: true, onWake: vi.fn(), onFatal }));
    act(() => { current().onerror?.({ error: 'not-allowed' }); current().end(); });
    await flush(10_000);
    expect(onFatal).toHaveBeenCalledWith('not-allowed');
    expect(instances).toHaveLength(1);
    expect(result.current.error).toBe('not-allowed');
  });

  it('mientras Logi habla en voz alta, lo que oye no cuenta (podría ser su propia voz)', () => {
    const onWake = vi.fn();
    renderHook(() => useWakeWord({ enabled: true, onWake }));
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { speaking: true } });
    act(() => current().say('hey logi', true));
    expect(onWake).not.toHaveBeenCalled();
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { speaking: false } });
  });

  it('sin soporte del navegador no hace nada', () => {
    delete window.SpeechRecognition; delete window.webkitSpeechRecognition;
    const { result } = renderHook(() => useWakeWord({ enabled: true, onWake: vi.fn() }));
    expect(result.current.supported).toBe(false);
    expect(instances).toHaveLength(0);
  });
});
