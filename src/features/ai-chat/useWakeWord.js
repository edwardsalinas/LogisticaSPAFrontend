import { useEffect, useRef, useState } from 'react';
import { getRecognitionClass } from './voice';
import { matchWake } from './wakeWord';

const RECOGNITION_LANG = 'es-BO';
const SETTLE_MS = 900; // tras oír «hey Logi» se espera un instante por si sigue con la orden en la misma frase
const RESTART_MS = 400;
const MAX_RESTART_MS = 8000;
// errores que no se arreglan reintentando: se apaga y se avisa (permiso denegado, sin micrófono)
const FATAL = new Set(['not-allowed', 'service-not-allowed', 'audio-capture']);

/**
 * Escucha continua de la frase «hey Logi» (opcional, la persona lo activa). Mientras `enabled`:
 *  - el micrófono está abierto SOLO con la pestaña visible y sin que el chat de voz u otra tarea de Logi lo estén usando
 *    (el navegador permite una escucha a la vez; `paused` lo suelta);
 *  - Chrome corta la escucha continua cada cierto tiempo: se reanuda sola, con espera creciente si falla;
 *  - al oír la frase llama a onWake(rest) con lo que siguió (puede ser '') y suelta el micrófono.
 * Devuelve { supported, listening, error }.
 */
export default function useWakeWord({ enabled, paused = false, onWake, onFatal }) {
  const Recognition = getRecognitionClass();
  const [listening, setListening] = useState(false);
  const [error, setError] = useState(null);
  const handlers = useRef({ onWake, onFatal });
  handlers.current = { onWake, onFatal };
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || document.visibilityState !== 'hidden');

  useEffect(() => {
    const onVis = () => setVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const active = Boolean(Recognition) && enabled && !paused && visible;

  useEffect(() => {
    if (!active) { setListening(false); return undefined; }
    let alive = true;
    let rec = null;
    let restart = null;
    let settle = null;
    let backoff = RESTART_MS;
    let pendingRest = null;

    const fire = () => {
      clearTimeout(settle);
      const rest = pendingRest ?? '';
      pendingRest = null;
      alive = false; // se suelta el micrófono para el chat de voz
      try { rec?.abort(); } catch { /* ya estaba detenido */ }
      setListening(false);
      handlers.current.onWake?.(rest);
    };

    const start = () => {
      if (!alive) return;
      rec = new Recognition();
      rec.lang = RECOGNITION_LANG;
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.onstart = () => { if (alive) { setListening(true); setError(null); } };
      rec.onresult = (event) => {
        // mientras Logi habla, lo que oye puede ser su propia voz: se ignora
        if (typeof window !== 'undefined' && window.speechSynthesis?.speaking) return;
        backoff = RESTART_MS; // si llega audio, la escucha funciona
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          const hit = matchWake(result[0]?.transcript);
          if (!hit) continue;
          pendingRest = hit.rest;
          if (result.isFinal) { fire(); return; }
          clearTimeout(settle);
          settle = setTimeout(fire, SETTLE_MS); // cada palabra nueva reinicia la espera
          return;
        }
      };
      rec.onerror = (event) => {
        if (FATAL.has(event.error)) {
          alive = false;
          setListening(false);
          setError(event.error);
          handlers.current.onFatal?.(event.error);
        }
      };
      rec.onend = () => {
        setListening(false);
        if (!alive) return;
        restart = setTimeout(start, backoff); // Chrome la corta solo cada tanto: se reanuda
        backoff = Math.min(MAX_RESTART_MS, backoff * 2);
      };
      try { rec.start(); } catch { rec.onend(); }
    };

    start();
    return () => {
      alive = false;
      clearTimeout(restart);
      clearTimeout(settle);
      try { rec?.abort(); } catch { /* ya estaba detenido */ }
      setListening(false);
    };
  }, [active, Recognition]);

  return { supported: Boolean(Recognition), listening, error };
}
