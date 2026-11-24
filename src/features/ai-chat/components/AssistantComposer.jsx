import { useCallback, useEffect, useRef, useState } from 'react';
import { FileText, Headphones, Mic, Send, Volume2, VolumeX } from 'lucide-react';
import VoiceMode from './VoiceMode';
import { useSpeechRecognition, useSpeechSynthesis } from '../useVoice';
import { stripForSpeech } from '../voice';
import { useSpeakPref } from '../speakPref';
import { MAX_MESSAGE_LENGTH } from '../useAssistantChat';

/**
 * Todo lo que hace falta para escribirle al asistente: texto, dictado por micrófono, foto de una guía de remisión,
 * chat de voz y lectura de las respuestas en voz alta. Lo usan la pantalla del Modo IA y el panel flotante,
 * para que ofrezcan lo mismo y no se vuelvan a desincronizar.
 */
export function useAssistantComposer({ chat, role }) {
  const { loading, send, readDocument } = chat;
  const [input, setInput] = useState('');
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [speakReplies, setSpeakReplies] = useSpeakPref(); // compartida con Logi y con la pantalla del Modo IA
  const synth = useSpeechSynthesis();
  const fileRef = useRef(null);
  // Si el panel ya se cerró cuando llega la respuesta, la lee Logi (no se lee dos veces)
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const canReadDocuments = role === 'admin' || role === 'logistics_operator'; // registrar paquetes es del personal
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite elegir la misma foto otra vez
    if (file) await readDocument?.(file);
  };

  // `ask` es estable (no cambia al escribir): las burbujas memoizadas no se vuelven a dibujar por cada tecla
  const latest = useRef({});
  latest.current = { loading, speakReplies, synth };
  const ask = useCallback(async (text) => {
    const { loading: busy, speakReplies: speak, synth: voice } = latest.current;
    if (!String(text).trim() || busy) return;
    const result = await send(text);
    // con "leer respuestas" activado, la respuesta también se escucha
    if (speak && result?.ok && mounted.current) voice.speak(stripForSpeech(result.text));
  }, [send]);

  const submit = async (text = input) => {
    if (!String(text).trim() || loading) return;
    setInput('');
    await ask(text);
  };

  // Dictado: se habla una frase, se envía y, si la lectura está activada, se responde en voz alta
  const dictation = useSpeechRecognition({ onFinal: (spoken) => submit(spoken) });

  const toggleSpeak = () => {
    const next = !speakReplies;
    setSpeakReplies(next);
    if (!next) synth.cancel();
  };

  const openVoice = () => {
    dictation.abort();
    synth.cancel();
    setVoiceOpen(true);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return {
    chat, loading, input, setInput, ask, submit, dictation, synth, speakReplies, toggleSpeak,
    voiceOpen, openVoice, closeVoice: () => setVoiceOpen(false), onKeyDown, fileRef, onFile, canReadDocuments,
  };
}

/**
 * Dos filas: arriba el campo y "Enviar"; debajo, las herramientas de voz. Así el campo conserva su ancho en un
 * teléfono y todos los controles son táctiles.
 */
export default function AssistantComposer({ composer, placeholder = 'Pregunta lo que necesites: ¿dónde está mi paquete?', compact = false }) {
  const { chat, loading, input, setInput, submit, dictation, synth, speakReplies, toggleSpeak, voiceOpen, openVoice, closeVoice, onKeyDown, fileRef, onFile, canReadDocuments } = composer;
  const toolButton = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors disabled:opacity-40';

  return (
    <>
      {voiceOpen && <VoiceMode chat={chat} onClose={closeVoice} />}
      <div className="rounded-2xl border border-surface-200 bg-white p-2 shadow-md focus-within:border-primary-600 focus-within:ring-2 focus-within:ring-primary-200">
        <div className="flex items-end gap-2">
          <textarea
            value={dictation.listening && dictation.interim ? dictation.interim : input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            maxLength={MAX_MESSAGE_LENGTH}
            aria-label="Mensaje para el asistente"
            placeholder={dictation.listening ? 'Te escucho…' : placeholder}
            rows={1}
            disabled={loading}
            className={`max-h-40 min-w-0 flex-1 resize-none rounded-2xl bg-transparent px-3 py-3 outline-none placeholder:text-surface-500 disabled:opacity-60 sm:px-4 ${compact ? 'min-h-[3rem] text-sm' : 'min-h-[3rem] text-base'}`}
          />
          <button
            type="button"
            onClick={() => submit()}
            disabled={loading || !input.trim()}
            className="flex h-12 min-w-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-3 text-sm font-bold text-white shadow-sm transition-opacity disabled:opacity-40 sm:px-5"
          >
            <Send size={16} aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Enviar</span>
          </button>
        </div>

        <div className="mt-1 flex items-center gap-2 border-t border-surface-100 px-1 pt-2">
          {dictation.supported && (
            <button
              type="button"
              onClick={() => (dictation.listening ? dictation.stop() : dictation.start())}
              disabled={loading}
              aria-label={dictation.listening ? 'Dejar de dictar' : 'Dictar con el micrófono'}
              aria-pressed={dictation.listening}
              title="Dictar con el micrófono"
              className={`${toolButton} ${dictation.listening ? 'animate-pulse motion-reduce:animate-none border-red-300 bg-red-50 text-red-600' : 'border-surface-200 bg-white text-surface-600 hover:bg-surface-50'}`}
            >
              <Mic size={18} aria-hidden="true" />
            </button>
          )}
          {canReadDocuments && (
            <>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/*" onChange={onFile} className="hidden" aria-label="Elegir la foto de una guía de remisión" tabIndex={-1} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={loading}
                aria-label="Adjuntar la foto de una guía de remisión"
                title="Registrar un paquete desde la foto de una guía de remisión"
                className={`${toolButton} border-surface-200 bg-white text-surface-600 hover:bg-surface-50`}
              >
                <FileText size={18} aria-hidden="true" />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={openVoice}
            aria-label="Abrir el chat de voz"
            title={dictation.supported ? 'Chat de voz: habla y el asistente te responde en voz alta' : 'Tu navegador no permite reconocimiento de voz (usa Chrome o Edge)'}
            className={`${toolButton} border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100`}
          >
            <Headphones size={18} aria-hidden="true" />
          </button>
          {synth.supported && (
            <button
              type="button"
              onClick={toggleSpeak}
              role="switch"
              aria-checked={speakReplies}
              aria-label="Leer las respuestas en voz alta"
              title={speakReplies ? 'Las respuestas se leen en voz alta' : 'Leer las respuestas en voz alta'}
              className={`${toolButton} ${speakReplies ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-surface-200 bg-white text-surface-500 hover:bg-surface-50'}`}
            >
              {speakReplies ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} aria-hidden="true" />}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
