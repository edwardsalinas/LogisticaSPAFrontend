import { useEffect, useRef, useState } from 'react';
import { Headphones, Mic, RotateCcw, Send, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '../../../app/AuthContext';
import useRole from '../../../app/useRole';
import Skeleton from '../../../components/atoms/Skeleton';
import ChatBubble from '../components/ChatBubble';
import VoiceMode from '../components/VoiceMode';
import { useSpeechRecognition, useSpeechSynthesis } from '../useVoice';
import { stripForSpeech } from '../voice';
import useAssistantChat, { MAX_MESSAGE_LENGTH } from '../useAssistantChat';
import { introForRole, suggestionsForRole } from '../suggestions';

export const displayName = (user) => {
  const full = user?.user_metadata?.full_name || user?.user_metadata?.name;
  if (full) return String(full).split(' ')[0];
  const local = String(user?.email ?? '').split('@')[0];
  return local ? local.charAt(0).toUpperCase() + local.slice(1) : '';
};

const SLOW_AFTER_MS = 8000;
const SPEAK_KEY = 'logistica:ai-speak-replies';

const readSpeakPref = () => {
  try { return window.localStorage.getItem(SPEAK_KEY) === '1'; } catch { return false; }
};

/**
 * Vista "IA primero": la conversación con el asistente es la pantalla principal.
 * Se muestra como inicio cuando el usuario activa el Modo IA, y siempre está disponible en /assistant.
 */
function AssistantHome() {
  const { user } = useAuth();
  const { role } = useRole();
  const chat = useAssistantChat();
  const { messages, loading, send, reset } = chat;
  const [input, setInput] = useState('');
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [speakReplies, setSpeakReplies] = useState(readSpeakPref);
  const synth = useSpeechSynthesis();
  const [slow, setSlow] = useState(false);
  const endRef = useRef(null);

  const name = displayName(user);
  const empty = messages.length === 0;

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  // Si la respuesta tarda, se avisa para que no parezca que se colgó
  useEffect(() => {
    if (!loading) { setSlow(false); return undefined; }
    const t = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(t);
  }, [loading]);

  const submit = async (text = input) => {
    if (!String(text).trim() || loading) return;
    setInput('');
    const result = await send(text);
    // con "leer respuestas" activado, la respuesta también se escucha
    if (speakReplies && result?.ok) synth.speak(stripForSpeech(result.text));
  };

  // Dictado: se habla una frase, se envía y, si la lectura está activada, se responde en voz alta
  const dictation = useSpeechRecognition({ onFinal: (spoken) => submit(spoken) });

  const toggleSpeak = () => {
    const next = !speakReplies;
    setSpeakReplies(next);
    if (!next) synth.cancel();
    try { window.localStorage.setItem(SPEAK_KEY, next ? '1' : '0'); } catch { /* sin almacenamiento */ }
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

  const composer = (
    <div className="rounded-[1.6rem] border border-surface-200 bg-white p-2 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.35)] focus-within:border-primary-400">
      <div className="flex items-end gap-2">
        <textarea
          value={dictation.listening && dictation.interim ? dictation.interim : input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          maxLength={MAX_MESSAGE_LENGTH}
          aria-label="Mensaje para el asistente"
          placeholder={dictation.listening ? 'Te escucho…' : 'Pregunta lo que necesites: ¿dónde está mi paquete?'}
          rows={1}
          disabled={loading}
          className="max-h-40 min-h-[3rem] flex-1 resize-none rounded-2xl bg-transparent px-4 py-3 text-base outline-none placeholder:text-surface-400 disabled:opacity-60"
        />
        {dictation.supported && (
          <button
            type="button"
            onClick={() => (dictation.listening ? dictation.stop() : dictation.start())}
            disabled={loading}
            aria-label={dictation.listening ? 'Dejar de dictar' : 'Dictar con el micrófono'}
            aria-pressed={dictation.listening}
            title="Dictar con el micrófono"
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-colors disabled:opacity-40 ${dictation.listening ? 'animate-pulse border-red-300 bg-red-50 text-red-600' : 'border-surface-200 bg-white text-surface-600 hover:bg-surface-50'}`}
          >
            <Mic size={18} aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          onClick={openVoice}
          aria-label="Abrir el chat de voz"
          title={dictation.supported ? 'Chat de voz: habla y el asistente te responde en voz alta' : 'Tu navegador no permite reconocimiento de voz (usa Chrome o Edge)'}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary-200 bg-primary-50 text-primary-700 transition-colors hover:bg-primary-100"
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
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-colors ${speakReplies ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-surface-200 bg-white text-surface-500 hover:bg-surface-50'}`}
          >
            {speakReplies ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} aria-hidden="true" />}
          </button>
        )}
        <button
          type="button"
          onClick={() => submit()}
          disabled={loading || !input.trim()}
          className="flex h-12 items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#0b4ea2_0%,#137fec_100%)] px-5 text-sm font-bold text-white shadow-sm transition-opacity disabled:opacity-40"
        >
          <Send size={16} aria-hidden="true" /> Enviar
        </button>
      </div>
    </div>
  );

  return (
    <div className="mx-auto flex min-h-[calc(100vh-9.5rem)] w-full max-w-3xl flex-col">
      {voiceOpen && <VoiceMode chat={chat} onClose={() => setVoiceOpen(false)} />}
      {empty ? (
        <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[linear-gradient(135deg,#0b4ea2_0%,#137fec_100%)] text-white shadow-lg shadow-primary-500/25">
            <Sparkles size={28} aria-hidden="true" />
          </span>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-surface-950 sm:text-4xl">{name ? `Hola, ${name}` : 'Hola'}</h2>
          <p className="mt-2 text-lg text-surface-600">¿En qué te puedo ayudar hoy?</p>
          <p className="mt-3 max-w-xl text-sm text-surface-500">{introForRole(role)}</p>

          <div className="mt-8 grid w-full gap-3 sm:grid-cols-2">
            {suggestionsForRole(role).map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => (s.prefill ? setInput(s.value) : submit(s.value))}
                className="flex items-center gap-3 rounded-2xl border border-surface-200 bg-white px-4 py-3.5 text-left text-sm font-medium text-surface-800 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md"
              >
                <span className="text-xl" aria-hidden="true">{s.icon}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 space-y-5 pb-6 pt-2">
          <div className="flex justify-end">
            <button type="button" onClick={() => { reset([]); setInput(''); }} className="inline-flex items-center gap-1.5 rounded-full border border-surface-200 bg-white px-3 py-1.5 text-xs font-semibold text-surface-600 hover:bg-surface-50">
              <RotateCcw size={13} aria-hidden="true" /> Nueva conversación
            </button>
          </div>
          <div className="space-y-5" aria-live="polite">
            {messages.map((m, i) => (
              <ChatBubble key={i} message={m} role={role} onAsk={submit} showFollowUps={i === messages.length - 1 && !loading} />
            ))}
            {loading && (
              <div className="flex items-start gap-3" role="status">
                <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600"><Sparkles size={16} className="animate-pulse" /></span>
                <div className="w-72 rounded-[1.35rem] rounded-tl-md border border-surface-100 bg-white px-4 py-4 shadow-sm">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-surface-500">Consultando…</p>
                  <Skeleton className="mt-3 h-3 w-11/12" />
                  <Skeleton className="mt-2 h-3 w-3/5" />
                  {slow && <p className="mt-3 text-xs text-surface-500">Sigo trabajando en tu consulta, puede tardar unos segundos más.</p>}
                </div>
              </div>
            )}
          </div>
          <div ref={endRef} />
        </div>
      )}

      <div className="sticky bottom-20 z-10 bg-gradient-to-t from-[#eef3f9] via-[#eef3f9]/95 to-transparent pb-2 pt-4 lg:bottom-4">
        {composer}
        <p className="mt-2 text-center text-xs text-surface-400">Si te pido hacer algo, preparo la acción y solo se ejecuta cuando tú la confirmas. Verifica lo crítico antes de decidir.</p>
      </div>
    </div>
  );
}

export default AssistantHome;
