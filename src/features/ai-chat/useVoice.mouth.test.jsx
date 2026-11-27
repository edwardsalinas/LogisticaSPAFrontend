import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSpeechSynthesis } from './useVoice';
import { mouthOpenFor } from './voice';
import { installSpeech, uninstallSpeech } from './voiceTestUtils';

/**
 * La boca de Logi sigue la voz: cada palabra que el navegador avisa («boundary») la abre según sus vocales y enseguida se entrecierra.
 * Si la voz no avisa palabras (las de la nube casi nunca lo hacen), la boca queda en null y Logi usa su animación continua de siempre.
 */
describe('useSpeechSynthesis: la boca sigue las palabras', () => {
  let utterances;
  beforeEach(() => {
    vi.useFakeTimers();
    installSpeech({ recognition: false, autoEnd: false });
    utterances = window.speechSynthesis.speak.mock.calls;
  });
  afterEach(() => { vi.useRealTimers(); uninstallSpeech(); });

  const speakAndGet = (hook, text = 'Hola amigos del equipo') => {
    act(() => hook.result.current.speak(text));
    return utterances.at(-1)[0];
  };

  it('sin palabras avisadas la boca es null (Logi usa su animación continua) y está hablando', () => {
    const hook = renderHook(() => useSpeechSynthesis());
    speakAndGet(hook);
    expect(hook.result.current.speaking).toBe(true);
    expect(hook.result.current.mouth).toBeNull();
  });

  it('cada palabra abre la boca según la palabra y 130 ms después se entrecierra', () => {
    const hook = renderHook(() => useSpeechSynthesis());
    const u = speakAndGet(hook);
    act(() => u.onboundary({ name: 'word', charIndex: 0 })); // «Hola»
    expect(hook.result.current.mouth).toBe(mouthOpenFor('Hola'));
    expect(hook.result.current.mouth).toBeGreaterThan(0.15);
    act(() => { vi.advanceTimersByTime(130); });
    expect(hook.result.current.mouth).toBe(0.15);
    act(() => u.onboundary({ name: 'word', charIndex: 5 })); // «amigos»
    expect(hook.result.current.mouth).toBe(mouthOpenFor('amigos'));
  });

  it('una palabra con vocales abiertas abre más que una con vocales cerradas', () => {
    expect(mouthOpenFor('casa')).toBeGreaterThan(mouthOpenFor('minuto'));
    expect(mouthOpenFor('')).toBeGreaterThanOrEqual(0);
    expect(mouthOpenFor('')).toBeLessThanOrEqual(1);
  });

  it('los avisos que no son de palabra (frase, marca) NO mueven la boca', () => {
    const hook = renderHook(() => useSpeechSynthesis());
    const u = speakAndGet(hook);
    act(() => u.onboundary({ name: 'sentence', charIndex: 0 }));
    expect(hook.result.current.mouth).toBeNull();
  });

  it('al terminar de hablar la boca vuelve a null y deja de estar hablando', () => {
    const hook = renderHook(() => useSpeechSynthesis());
    const u = speakAndGet(hook);
    act(() => u.onboundary({ name: 'word', charIndex: 0 }));
    act(() => u.onend());
    expect(hook.result.current.mouth).toBeNull();
    expect(hook.result.current.speaking).toBe(false);
  });

  it('cancelar cierra la boca, y un aviso de palabra que llega tarde (de lo cancelado) se ignora', () => {
    const hook = renderHook(() => useSpeechSynthesis());
    const u = speakAndGet(hook);
    act(() => u.onboundary({ name: 'word', charIndex: 0 }));
    act(() => hook.result.current.cancel());
    expect(hook.result.current.mouth).toBeNull();
    act(() => u.onboundary({ name: 'word', charIndex: 0 })); // llega después de cancelar
    expect(hook.result.current.mouth).toBeNull();
    act(() => { vi.advanceTimersByTime(500); });
    expect(hook.result.current.mouth).toBeNull(); // y ningún temporizador la reabre
  });

  it('una orden nueva reemplaza a la anterior: los avisos de la frase vieja no mueven la boca', () => {
    const hook = renderHook(() => useSpeechSynthesis());
    const first = speakAndGet(hook, 'Primera frase larga');
    const second = speakAndGet(hook, 'Segunda frase');
    act(() => first.onboundary({ name: 'word', charIndex: 0 }));
    expect(hook.result.current.mouth).toBeNull();
    act(() => second.onboundary({ name: 'word', charIndex: 0 }));
    expect(hook.result.current.mouth).toBe(mouthOpenFor('Segunda'));
  });

  it('sin soporte de voz no falla: no habla y la boca sigue en null', () => {
    uninstallSpeech();
    const onEnd = vi.fn();
    const hook = renderHook(() => useSpeechSynthesis());
    act(() => hook.result.current.speak('Hola', { onEnd }));
    expect(onEnd).toHaveBeenCalled();
    expect(hook.result.current.speaking).toBe(false);
    expect(hook.result.current.mouth).toBeNull();
  });
});
