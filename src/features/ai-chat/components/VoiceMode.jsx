import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Square, Volume2, X } from 'lucide-react';
import { useSpeechRecognition, useSpeechSynthesis } from '../useVoice';
import { plainText, stripForSpeech } from '../voice';

const MAX_SILENCES = 2; // tras dos silencios seguidos el modo manos libres se detiene

const PHASE_TEXT = {
  idle: 'Toca el micrófono para hablar',
  listening: 'Te escucho…',
  thinking: 'Pensando…',
  speaking: 'Hablando… toca para interrumpir',
};

/**
 * Chat de voz: hablas, el asistente responde en voz alta y vuelve a escucharte (manos libres).
 * Comparte la conversación con el chat de texto: lo dicho queda escrito y las tarjetas aparecen al cerrar.
 * Las acciones (crear, entregar, registrar) siguen exigiendo el clic en "Confirmar" en la pantalla.
 */
export default function VoiceMode({ chat, onClose }) {
  const { send, loading, messages } = chat;
  const synth = useSpeechSynthesis();
  const [handsFree, setHandsFree] = useState(true);
  const [notice, setNotice] = useState(null);
  const silences = useRef(0);
  const handsFreeRef = useRef(handsFree);
  handsFreeRef.current = handsFree;
  const startRef = useRef(() => {});
  const mountedRef = useRef(true);
  const manualStopRef = useRef(false); // el usuario detuvo la escucha a propósito: no se reinicia sola

  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
  const lastAttachments = lastAssistant?.attachments ?? [];
  const hasProposal = lastAttachments.some((a) => a.kind === 'action_proposal');

  const listenAgain = useCallback(() => {
    if (handsFreeRef.current && silences.current < MAX_SILENCES) startRef.current();
  }, []);

  const handleUtterance = useCallback(async (text) => {
    silences.current = 0;
    setNotice(null);
    synth.cancel();
    const result = await send(text, { voice: true });
    if (!result) return;
    synth.speak(stripForSpeech(result.text), { onEnd: listenAgain });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- synth.* son estables
  }, [send, listenAgain]);

  const recognition = useSpeechRecognition({
    onFinal: handleUtterance,
    onEnd: (hadText, fatal) => {
      if (hadText || fatal || !mountedRef.current) return; // con texto lo atiende handleUtterance; un error no se arregla reintentando
      if (manualStopRef.current) { manualStopRef.current = false; return; }
      silences.current += 1;
      if (silences.current >= MAX_SILENCES) setNotice('No te oí. Toca el micrófono cuando quieras seguir.');
      else if (handsFreeRef.current) startRef.current(); // un silencio: se vuelve a escuchar una vez más
    },
  });
  startRef.current = recognition.start;

  // Al abrir, empieza a escuchar; al cerrar, corta el micrófono y la voz
  useEffect(() => {
    mountedRef.current = true; // React en desarrollo monta, desmonta y vuelve a montar: debe volver a ser true
    if (recognition.supported) recognition.start();
    return () => { mountedRef.current = false; recognition.abort(); synth.cancel(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al montar/desmontar
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const phase = recognition.listening ? 'listening' : loading ? 'thinking' : synth.speaking ? 'speaking' : 'idle';

  const onOrb = () => {
    if (phase === 'listening') { manualStopRef.current = true; recognition.stop(); return; }
    silences.current = 0;
    setNotice(null);
    synth.cancel(); // interrumpir al asistente
    recognition.start();
  };

  const caption = recognition.listening && recognition.interim ? recognition.interim : null;
  const error = recognition.error;

  return (
    <div role="dialog" aria-modal="true" aria-label="Chat de voz" className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-[radial-gradient(circle_at_top,#133a6b_0%,#06111f_70%)] px-6 py-8 text-white">
      <div className="flex w-full max-w-3xl items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-200/80">Chat de voz</p>
        <button type="button" onClick={onClose} aria-label="Salir del chat de voz" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 hover:bg-white/20">
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <div className="flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-8 text-center">
        {!recognition.supported ? (
          <p role="alert" className="max-w-md rounded-2xl border border-amber-300/40 bg-amber-400/10 px-5 py-4 text-sm text-amber-100">
            Tu navegador no permite reconocimiento de voz. Usa Chrome o Edge para hablar con el asistente; mientras tanto puedes escribirle.
          </p>
        ) : (
          <button
            type="button"
            onClick={onOrb}
            aria-label={phase === 'listening' ? 'Dejar de escuchar' : 'Hablar'}
            className="relative flex h-40 w-40 items-center justify-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-sky-300/60"
          >
            {(phase === 'listening' || phase === 'speaking') && (
              <span aria-hidden="true" className={`absolute inset-0 rounded-full ${phase === 'listening' ? 'bg-sky-400/30' : 'bg-emerald-400/25'} animate-ping`} />
            )}
            <span aria-hidden="true" className={`relative flex h-32 w-32 items-center justify-center rounded-full shadow-2xl transition-colors ${phase === 'listening' ? 'bg-sky-500' : phase === 'speaking' ? 'bg-emerald-500' : phase === 'thinking' ? 'bg-violet-500' : 'bg-white/15'} ${phase === 'thinking' ? 'animate-pulse' : ''}`}>
              {phase === 'speaking' ? <Volume2 size={44} /> : phase === 'listening' ? <Square size={36} fill="currentColor" /> : <Mic size={44} />}
            </span>
          </button>
        )}

        <p data-testid="voice-phase" role="status" className="text-lg font-semibold text-sky-100">{PHASE_TEXT[phase]}</p>

        <div className="min-h-[7rem] w-full space-y-3" aria-live="polite">
          {caption && <p className="text-xl font-medium text-white">“{caption}”</p>}
          {!caption && lastAssistant && !lastAssistant.isError && (
            <p className="mx-auto max-w-xl text-base leading-relaxed text-sky-50/90">{plainText(lastAssistant.content)}</p>
          )}
          {error && <p role="alert" className="text-sm font-semibold text-amber-200">{error}</p>}
          {notice && <p className="text-sm text-sky-200/80">{notice}</p>}
          {hasProposal && <p className="text-sm font-semibold text-amber-200">Hay una acción esperando tu confirmación. Cierra el chat de voz y pulsa Confirmar en la tarjeta.</p>}
          {!hasProposal && lastAttachments.length > 0 && <p className="text-xs text-sky-200/70">Los detalles están en la conversación; ciérrame para verlos.</p>}
        </div>
      </div>

      <div className="flex w-full max-w-3xl flex-col items-center gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-sky-100/90">
          <input type="checkbox" checked={handsFree} onChange={(e) => setHandsFree(e.target.checked)} className="h-4 w-4 rounded" />
          Manos libres: volver a escucharme al terminar de hablar
        </label>
        <p className="max-w-xl text-center text-[0.7rem] leading-relaxed text-sky-200/60">
          El reconocimiento de voz lo hace tu navegador (en Chrome, el audio se procesa en servidores de Google). El asistente solo recibe el texto. Para ejecutar acciones tendrás que pulsar Confirmar en pantalla.
        </p>
      </div>
    </div>
  );
}
