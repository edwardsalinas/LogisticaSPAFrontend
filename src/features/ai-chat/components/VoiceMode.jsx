import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Mic, Square, Volume2, X } from 'lucide-react';
import { useSpeechRecognition, useSpeechSynthesis } from '../useVoice';
import { plainText, stripForSpeech } from '../voice';
import apiService from '../../../services/apiService';
import { canGuide, useGuidedRun } from '../guided/GuidedRunProvider';
import { applyGuidedOutcome } from '../guided/outcome';
import { CONFIRM_PROMPT, parseVoiceConfirmation, REPEAT_PROMPT, spokenProposal } from '../guided/voiceConfirm';

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
 * Las acciones que Logi sabe hacer a la vista de todos (crear paquete, asignar, registrar evento) se confirman DICIENDO
 * «sí, hazlo» (con manos libres): Logi lee el resumen, pregunta, y al oír el «sí» cierra el chat de voz y lo hace en pantalla.
 * Entregar y las acciones masivas siguen exigiendo el clic en "Confirmar". La frase de confirmación es prudente: ver voiceConfirm.js.
 */
export default function VoiceMode({ chat, onClose }) {
  const { send, loading, messages } = chat;
  const synth = useSpeechSynthesis();
  const guided = useGuidedRun(); // null fuera del layout: sin Logi no hay confirmación por voz
  const [pending, setPending] = useState(null); // acción propuesta que espera el «sí, hazlo»
  const pendingRef = useRef(null);
  const confirmTries = useRef(0);
  const latest = useRef({});
  latest.current = { chat, guided, onClose };
  const setPendingAction = (action) => { pendingRef.current = action; setPending(action); };
  const [handsFree, setHandsFree] = useState(true);
  const [notice, setNotice] = useState(null);
  const silences = useRef(0);
  const handsFreeRef = useRef(handsFree);
  handsFreeRef.current = handsFree;
  const dialogRef = useRef(null);
  const orbRef = useRef(null);
  const closeRef = useRef(null);
  const startRef = useRef(() => {});
  const mountedRef = useRef(true);
  const manualStopRef = useRef(false); // el usuario detuvo la escucha a propósito: no se reinicia sola

  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
  const lastAttachments = lastAssistant?.attachments ?? [];
  const hasProposal = lastAttachments.some((a) => a.kind === 'action_proposal');

  const listenAgain = useCallback(() => {
    if (handsFreeRef.current && silences.current < MAX_SILENCES) startRef.current();
  }, []);

  // La respuesta a «¿lo hago?». Es PRUDENTE: solo una frase corta y afirmativa ejecuta; la duda se vuelve a preguntar.
  const answerConfirmation = async (text) => {
    const { chat: c, guided: g, onClose: close } = latest.current;
    const action = pendingRef.current;
    if (!action) return;
    const answer = parseVoiceConfirmation(text);

    if (answer === 'yes') {
      if (action.expires_at && Date.parse(action.expires_at) <= Date.now()) {
        setPendingAction(null);
        setNotice('Esa propuesta venció. Pídemela otra vez.');
        synth.speak('Esa propuesta ya venció. Pídemela otra vez.', { onEnd: listenAgain });
        return;
      }
      setPendingAction(null);
      recognitionRef.current?.abort();
      synth.cancel();
      close(); // se cierra el chat de voz: la pantalla queda libre para que Logi trabaje (y hable en voz alta)
      const out = await g.start(action, { aloud: true });
      applyGuidedOutcome({ out, action, chat: c });
      return;
    }

    if (answer === 'no') {
      setPendingAction(null);
      try {
        const res = await apiService.post(`/ai-agent/actions/${action.id}/cancel`);
        c.settleAction?.(action.id, { status: 'cancelled', message: res?.result?.message });
      } catch { /* si no se pudo cancelar, la propuesta vence sola a los 10 minutos */ }
      synth.speak('Listo, no hice ningún cambio.', { onEnd: listenAgain });
      return;
    }

    confirmTries.current += 1;
    if (confirmTries.current >= 2) {
      setPendingAction(null);
      setNotice('Dejé la acción pendiente: confírmala con el botón de la tarjeta, o pídeme otra cosa.');
      synth.speak('No te entendí. Dejo la acción pendiente: puedes confirmarla con el botón, o pedirme otra cosa.');
      return;
    }
    synth.speak(REPEAT_PROMPT, { onEnd: listenAgain });
  };

  const handleUtterance = useCallback(async (text) => {
    silences.current = 0;
    setNotice(null);
    synth.cancel();
    if (pendingRef.current) { await answerConfirmationRef.current(text); return; }
    const result = await send(text, { voice: true });
    if (!result) return;

    // ¿Preparó una acción que Logi sabe hacer? (solo con manos libres: sin él no se vuelve a escuchar el «sí»)
    const proposal = latest.current.guided && handsFreeRef.current
      ? result.attachments?.find((a) => a.kind === 'action_proposal')?.action
      : null;
    if (proposal && canGuide(proposal)) {
      setPendingAction(proposal);
      confirmTries.current = 0;
      // solo el resumen del servidor: el texto del modelo suele decir «pulsa Confirmar», que aquí se contradiría con «¿lo hago?»
      synth.speak(`Preparé esto. ${spokenProposal(proposal)} ${CONFIRM_PROMPT}`, { onEnd: listenAgain });
      return;
    }
    synth.speak(stripForSpeech(result.text), { onEnd: listenAgain });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- synth.* son estables
  }, [send, listenAgain]);
  const answerConfirmationRef = useRef(answerConfirmation);
  answerConfirmationRef.current = answerConfirmation;
  const recognitionRef = useRef(null);

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
  recognitionRef.current = recognition;

  // Al abrir, empieza a escuchar; al cerrar, corta el micrófono y la voz
  useEffect(() => {
    mountedRef.current = true; // React en desarrollo monta, desmonta y vuelve a montar: debe volver a ser true
    if (recognition.supported) recognition.start();
    return () => { mountedRef.current = false; recognition.abort(); synth.cancel(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al montar/desmontar
  }, []);

  // Diálogo modal de verdad: el foco entra, el resto de la página queda inerte y, al cerrar, el foco vuelve a donde estaba
  useEffect(() => {
    const previous = document.activeElement;
    const appRoot = document.getElementById('root');
    appRoot?.setAttribute('inert', '');
    (orbRef.current ?? closeRef.current ?? dialogRef.current)?.focus();
    return () => {
      appRoot?.removeAttribute('inert');
      if (previous instanceof HTMLElement && document.contains(previous)) previous.focus();
    };
  }, []);

  // Tab no sale del diálogo: al llegar al último control vuelve al primero (y al revés con Mayús+Tab)
  const trapTab = (e) => {
    if (e.key !== 'Tab') return;
    const focusables = [...dialogRef.current.querySelectorAll('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')];
    if (focusables.length === 0) { e.preventDefault(); return; }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

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

  return createPortal(
    <div ref={dialogRef} tabIndex={-1} onKeyDown={trapTab} role="dialog" aria-modal="true" aria-label="Chat de voz" className="[&_:focus-visible]:outline-sky-300 fixed inset-0 z-50 flex flex-col items-center justify-between bg-[radial-gradient(circle_at_top,#133a6b_0%,#06111f_70%)] px-6 py-8 text-white">
      <div className="flex w-full max-w-3xl items-center justify-between">
        <p className="text-xs font-semibold text-sky-200/80">Chat de voz</p>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Salir del chat de voz" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 hover:bg-white/20">
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
            ref={orbRef}
            type="button"
            onClick={onOrb}
            aria-label={phase === 'listening' ? 'Dejar de escuchar' : 'Hablar'}
            className="relative flex h-40 w-40 items-center justify-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-sky-300/60"
          >
            {(phase === 'listening' || phase === 'speaking') && (
              <span aria-hidden="true" className={`absolute inset-0 rounded-full ${phase === 'listening' ? 'bg-sky-400/30' : 'bg-emerald-400/25'} animate-ping motion-reduce:animate-none`} />
            )}
            <span aria-hidden="true" className={`relative flex h-32 w-32 items-center justify-center rounded-full shadow-2xl transition-colors ${phase === 'listening' ? 'bg-sky-500' : phase === 'speaking' ? 'bg-emerald-500' : phase === 'thinking' ? 'bg-violet-500' : 'bg-white/15'} ${phase === 'thinking' ? 'animate-pulse motion-reduce:animate-none' : ''}`}>
              {phase === 'speaking' ? <Volume2 size={44} /> : phase === 'listening' ? <Square size={36} fill="currentColor" /> : <Mic size={44} />}
            </span>
          </button>
        )}

        <p data-testid="voice-phase" role="status" className="text-lg font-semibold text-sky-100">{PHASE_TEXT[phase]}</p>

        <div className="min-h-[7rem] w-full space-y-3" aria-live="polite">
          {caption && <p aria-hidden="true" className="text-xl font-medium text-white">“{caption}”</p>}
          {!caption && !pending && lastAssistant && !lastAssistant.isError && (
            <p className="mx-auto max-w-xl text-base leading-relaxed text-sky-50/90">{plainText(lastAssistant.content)}</p>
          )}
          {error && <p role="alert" className="text-sm font-semibold text-amber-200">{error}</p>}
          {notice && <p className="text-sm text-sky-200/80">{notice}</p>}
          {pending && (
            <div className="mx-auto w-full max-w-xl rounded-2xl border border-amber-300/40 bg-amber-400/10 p-4 text-left">
              <p className="text-sm font-semibold text-amber-100">{pending.title}</p>
              <ul className="mt-2 space-y-1 text-sm text-amber-50/90">{(pending.lines ?? []).map((line) => <li key={line}>{line}</li>)}</ul>
              <p className="mt-3 text-sm font-semibold text-amber-100">Di «sí, hazlo» o «cancela».</p>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => answerConfirmation('sí')} className="min-h-11 flex-1 rounded-xl bg-emerald-500 px-4 text-sm font-bold text-white hover:bg-emerald-600">Sí, hazlo</button>
                <button type="button" onClick={() => answerConfirmation('cancela')} className="min-h-11 flex-1 rounded-xl border border-white/30 bg-white/10 px-4 text-sm font-bold text-white hover:bg-white/20">Cancelar</button>
              </div>
            </div>
          )}
          {hasProposal && !pending && <p className="text-sm font-semibold text-amber-200">Hay una acción esperando tu confirmación. Cierra el chat de voz y pulsa Confirmar en la tarjeta.</p>}
          {!hasProposal && lastAttachments.length > 0 && <p className="text-xs text-sky-200/80">Los detalles están en la conversación; ciérrame para verlos.</p>}
        </div>
      </div>

      <div className="flex w-full max-w-3xl flex-col items-center gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-sky-100/90">
          <input type="checkbox" checked={handsFree} onChange={(e) => setHandsFree(e.target.checked)} className="h-4 w-4 rounded" />
          Manos libres: volver a escucharme al terminar de hablar
        </label>
        <p className="max-w-xl text-center text-xs leading-relaxed text-sky-200/80">
          El reconocimiento de voz lo hace tu navegador (en Chrome, el audio se procesa en servidores de Google). El asistente solo recibe el texto. Crear un paquete, asignarlo o registrar un evento se confirma diciendo «sí, hazlo» y Logi lo hace en pantalla; entregar y las acciones masivas se confirman con el botón.
        </p>
      </div>
    </div>,
    document.body
  );
}
