import { useCallback, useEffect, useRef, useState } from 'react';
import { chunkForSpeech, getRecognitionClass, mouthOpenFor, pickSpanishVoice, recognitionErrorMessage, synthesisSupported } from './voice';

const RECOGNITION_LANG = 'es-BO';

/**
 * Dictado: una frase por vez. `onFinal(texto)` se llama cuando el navegador entrega la transcripción definitiva.
 */
export function useSpeechRecognition({ onFinal, onEnd, lang = RECOGNITION_LANG } = {}) {
  const Recognition = getRecognitionClass();
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState(null);
  const recRef = useRef(null);
  const finalRef = useRef('');
  const fatalRef = useRef(false); // hubo un error que no se arregla reintentando (permiso, micrófono, red)
  const handlers = useRef({ onFinal, onEnd });
  handlers.current = { onFinal, onEnd };

  const stop = useCallback(() => {
    try { recRef.current?.stop(); } catch { /* ya estaba detenido */ }
  }, []);

  // Cancela la escucha actual SIN avisar. En los navegadores el evento "fin" de una escucha abortada llega después
  // (a veces cuando ya empezó otra): por eso solo la escucha vigente (recRef) puede actualizar el estado o avisar.
  const abort = useCallback(() => {
    const current = recRef.current;
    recRef.current = null;
    setListening(false);
    setInterim('');
    try { current?.abort(); } catch { /* ya estaba detenido */ }
  }, []);

  const start = useCallback(() => {
    if (!Recognition) return false;
    abort();
    setError(null);
    setInterim('');
    finalRef.current = '';
    fatalRef.current = false;

    const rec = new Recognition();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    rec.onresult = (event) => {
      if (recRef.current !== rec) return; // resultado tardío de una escucha cancelada
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const r = event.results[i];
        if (r.isFinal) finalRef.current += r[0].transcript;
        else interimText += r[0].transcript;
      }
      setInterim((finalRef.current + interimText).trim());
    };
    rec.onerror = (event) => {
      if (recRef.current !== rec) return;
      const message = recognitionErrorMessage(event.error);
      if (message) fatalRef.current = true; // los silencios ('no-speech') y cancelaciones no tienen mensaje: no son fatales
      setError(message);
    };
    rec.onend = () => {
      if (recRef.current !== rec) return; // una escucha ya cancelada o reemplazada: se ignora
      recRef.current = null;
      setListening(false);
      const text = finalRef.current.trim();
      setInterim('');
      if (text) handlers.current.onFinal?.(text);
      handlers.current.onEnd?.(Boolean(text), fatalRef.current);
    };

    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
      return true;
    } catch {
      setListening(false);
      return false;
    }
  }, [Recognition, lang, abort]);

  useEffect(() => () => abort(), [abort]);

  return { supported: Boolean(Recognition), listening, interim, error, start, stop, abort };
}

/**
 * Lectura en voz alta con una voz en español. `speak(texto, { onEnd })` encadena trozos cortos y `cancel()` corta.
 */
export function useSpeechSynthesis() {
  const supported = synthesisSupported();
  const [speaking, setSpeaking] = useState(false);
  const [mouth, setMouth] = useState(null); // apertura de la boca (0 a 1) mientras suena una palabra; null si la voz no avisa palabras
  const mouthTimer = useRef(null);
  const voiceRef = useRef(null);
  const tokenRef = useRef(0);

  useEffect(() => {
    if (!supported) return undefined;
    const synthesis = window.speechSynthesis; // se guarda la referencia: la limpieza no debe depender de window
    const load = () => { voiceRef.current = pickSpanishVoice(synthesis.getVoices()); };
    load();
    synthesis.addEventListener?.('voiceschanged', load); // las voces cargan de forma asíncrona
    return () => synthesis.removeEventListener?.('voiceschanged', load);
  }, [supported]);

  const cancel = useCallback(() => {
    tokenRef.current += 1; // invalida los trozos pendientes
    if (supported) window.speechSynthesis?.cancel();
    clearTimeout(mouthTimer.current);
    setMouth(null);
    setSpeaking(false);
  }, [supported]);

  const speak = useCallback((text, { onEnd } = {}) => {
    if (!supported) { onEnd?.(); return; }
    const chunks = chunkForSpeech(text);
    if (chunks.length === 0) { onEnd?.(); return; }
    window.speechSynthesis.cancel();
    const token = (tokenRef.current += 1);
    setSpeaking(true);

    const next = (i) => {
      if (token !== tokenRef.current) return; // llegó otra orden (o cancel): se abandona
      if (i >= chunks.length) { clearTimeout(mouthTimer.current); setMouth(null); setSpeaking(false); onEnd?.(); return; }
      const u = new window.SpeechSynthesisUtterance(chunks[i]);
      u.lang = voiceRef.current?.lang || 'es-ES';
      if (voiceRef.current) u.voice = voiceRef.current;
      u.rate = 1.02;
      // la boca sigue las palabras: se abre al empezar cada una y se entrecierra enseguida
      u.onboundary = (e) => {
        if (token !== tokenRef.current || (e.name && e.name !== 'word')) return;
        const word = chunks[i].slice(e.charIndex ?? 0).match(/^\S+/)?.[0] ?? '';
        setMouth(mouthOpenFor(word));
        clearTimeout(mouthTimer.current);
        mouthTimer.current = setTimeout(() => setMouth(0.15), 130);
      };
      u.onend = () => next(i + 1);
      u.onerror = () => next(i + 1);
      window.speechSynthesis.speak(u);
    };
    next(0);
  }, [supported]);

  useEffect(() => {
    const synthesis = supported ? window.speechSynthesis : null;
    return () => synthesis?.cancel();
  }, [supported]);

  return { supported, speaking, mouth, speak, cancel };
}
