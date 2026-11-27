import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Pause, Play, Volume2, VolumeX } from 'lucide-react';
import AssistantAvatar from './AssistantAvatar';
import VoiceStrip from './VoiceStrip';
import { useVoicePresenter, useVoiceUi } from '../voiceDock';
import { prefersReducedMotion, stripForSpeech } from '../voice';
import { useSpeechSynthesis } from '../useVoice';
import { useSpeakPref } from '../speakPref';
import { useGuidedRun } from '../guided/GuidedRunProvider';

const WIDTH = 60; // ancho del robot en pantalla (px)
const MARGIN = 12;
const SPEED = 70; // px por segundo al caminar
const GREETING_KEY = 'logi:saludo';
const MAX_SPOKEN = 600; // caracteres que Logi lee de una respuesta larga

const rand = (min, max) => min + Math.random() * (max - min);
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

/** Primera frase de una respuesta, sin marcas de formato, para el globo de texto. */
export const speechFromReply = (text) => {
  const clean = (line) => line
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s*(?:[-•*]|\d+[.)])\s+/, '')
    .replace(/[`*_#>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  // la primera línea con contenido (suele ser el título o la frase principal); las viñetas no se mezclan con ella
  const lines = String(text ?? '').split(/\n+/).map(clean).filter(Boolean);
  if (!lines.length) return '';
  const first = lines[0].length >= 12 ? lines[0] : lines.join(' ');
  const sentence = first.match(/^.{12,}?[.!?](\s|$)/)?.[0].trim() ?? first;
  return sentence.length > 110 ? `${sentence.slice(0, 107).trimEnd()}…` : sentence;
};

const bubbleFor = (status, reply) => {
  if (status === 'confirm') return 'Preparé una acción y necesito tu confirmación.';
  if (status === 'thinking') return 'Pensando…';
  if (status === 'unread') return speechFromReply(reply) || 'Tengo una respuesta para ti.';
  return '';
};

/**
 * Logi como compañero: vive en la parte baja de la pantalla, pasea de un lado a otro cuando no hay nada pendiente y,
 * cuando el asistente tiene algo que decir (respuesta nueva, acción por confirmar, pensando), se detiene y lo dice en un globo.
 * Un clic lo abre o lo cierra el chat. Se queda quieto si pasas el cursor, lo enfocas, el sistema pide reducir el movimiento
 * o la persona lo desactiva (wander=false).
 *
 * Avisos proactivos (alert): una excepción real de la operación, en un globo con su acción. Logi se detiene, se preocupa si es
 * un retraso y la persona decide: hacerlo, «Después» o silenciar ese tipo. Pausa visible (onTogglePause): un movimiento de
 * más de 5 segundos junto al contenido necesita un control claro y fácil de encontrar (WCAG 2.2.2), no escondido en el chat.
 */
function LogiCompanion({ open, status, text, reply, wander = true, onToggle, panelId, badge, alert = null, onAlertAccept, onAlertSnooze, onAlertMute, onTogglePause }) {
  const rootRef = useRef(null);
  const botRef = useRef(null);
  const xRef = useRef(null);
  const [pos, setPos] = useState({ x: null, dur: 0, dir: -1, walking: false });
  const [hovered, setHovered] = useState(false);
  const [speech, setSpeech] = useState('');
  const [waving, setWaving] = useState(false);
  const calm = prefersReducedMotion();
  const synth = useSpeechSynthesis();
  const guided = useGuidedRun();
  const working = Boolean(guided?.active); // mientras Logi hace una acción en pantalla, el compañero se oculta
  const [speakOn, setSpeakOn] = useSpeakPref(); // el mismo interruptor de «Leer las respuestas en voz alta»
  const speakingRef = useRef(false);
  speakingRef.current = synth.speaking;
  const spokenKey = useRef('');
  const [look, setLook] = useState(null);
  const { live } = useVoiceUi(); // la voz no tiene ventana: Logi la muestra en su globo
  const voiceOn = Boolean(live) && !open && !working;
  useVoicePresenter(!open && !working);

  // posición inicial: el rincón derecho, donde estaba el botón
  useLayoutEffect(() => {
    const x = Math.max(MARGIN, window.innerWidth - WIDTH - MARGIN);
    xRef.current = x;
    setPos({ x, dur: 0, dir: -1, walking: false });
  }, []);

  useEffect(() => { if (pos.x != null) xRef.current = pos.x; }, [pos.x]);

  // Si cambia el tamaño de la ventana, que no se salga de la pantalla
  useEffect(() => {
    const onResize = () => {
      const max = Math.max(MARGIN, window.innerWidth - WIDTH - MARGIN);
      if (xRef.current != null && xRef.current > max) setPos((p) => ({ ...p, x: max, dur: 0, walking: false }));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // mientras habla se detiene: así el globo queda pegado a donde está de verdad (no a donde iba)
  const roaming = wander && !calm && !open && !working && !alert && !voiceOn && status === 'idle' && !hovered && !speech;

  // Paseo: camina a un punto al azar, descansa unos segundos (a veces saluda) y repite
  useEffect(() => {
    if (!roaming) {
      // se detiene donde está (no salta al destino)
      const left = botRef.current?.getBoundingClientRect().left;
      setPos((p) => (p.walking ? { ...p, x: Number.isFinite(left) && left > 0 ? left : p.x, dur: 0, walking: false } : p));
      return undefined;
    }
    let timer;
    const rest = () => {
      setPos((p) => ({ ...p, walking: false, dur: 0 }));
      if (Math.random() < 0.4) { setWaving(true); timer = setTimeout(() => { setWaving(false); timer = setTimeout(walk, rand(3000, 7000)); }, 2600); }
      else timer = setTimeout(walk, rand(4000, 9000));
    };
    const walk = () => {
      const max = Math.max(MARGIN, window.innerWidth - WIDTH - MARGIN);
      const cur = xRef.current ?? max;
      let target = rand(MARGIN, max);
      if (Math.abs(target - cur) < 90) {
        // muy cerca: da un paseíto de 120 a 260 px hacia donde HAYA sitio (en un borde, el recorte lo dejaba sin moverse)
        const step = rand(120, 260);
        const dir = Math.random() < 0.5 ? -1 : 1;
        target = cur + dir * step;
        if (target > max || target < MARGIN) target = cur - dir * step;
        target = clamp(target, MARGIN, max);
      }
      const dur = Math.abs(target - cur) / SPEED;
      setPos({ x: target, dur, dir: target > cur ? 1 : -1, walking: true });
      timer = setTimeout(rest, dur * 1000);
    };
    timer = setTimeout(walk, 2000);
    return () => clearTimeout(timer);
  }, [roaming]);

  // Globo de texto: se muestra al cambiar lo que el asistente tiene que decir y se recoge solo
  useEffect(() => {
    if (open) { setSpeech(''); return undefined; }
    const line = bubbleFor(status, reply);
    setSpeech(line);
    if (!line || status === 'thinking' || status === 'confirm') return undefined; // mientras dure ese estado se queda
    let t;
    const hide = () => { if (speakingRef.current) t = setTimeout(hide, 3000); else setSpeech(''); }; // no se recoge mientras habla
    t = setTimeout(hide, 9000);
    return () => clearTimeout(t);
  }, [status, reply, open]);

  // Saludo, una vez por sesión
  useEffect(() => {
    if (open || window.sessionStorage.getItem(GREETING_KEY)) return undefined;
    const t = setTimeout(() => {
      window.sessionStorage.setItem(GREETING_KEY, '1');
      setSpeech((current) => current || '¡Hola! Soy Logi. Haz clic en mí si necesitas ayuda.');
      setWaving(true);
      setTimeout(() => setWaving(false), 2600);
      setTimeout(() => setSpeech((current) => (current === '¡Hola! Soy Logi. Haz clic en mí si necesitas ayuda.' ? '' : current)), 7000);
    }, 1500);
    return () => clearTimeout(t);
  }, [open]);

  // Qué lee en voz alta: el aviso de confirmación tal cual; de una respuesta, su texto limpio (sin formato ni códigos enteros)
  const textToRead = useCallback(() => {
    if (status === 'unread') return stripForSpeech(reply).slice(0, MAX_SPOKEN);
    return stripForSpeech(bubbleFor(status, reply) || speech);
  }, [status, reply, speech]);

  // Con «leer respuestas» activado, lo que Logi tiene que decir también se escucha (una vez por aviso)
  useEffect(() => {
    if (open || voiceOn || !speakOn || !synth.supported || !['unread', 'confirm'].includes(status)) return;
    const key = `${status}:${status === 'unread' ? reply : ''}`;
    if (spokenKey.current === key || window.speechSynthesis?.speaking) return; // ya se leyó o hay algo sonando
    const said = textToRead();
    if (said) { spokenKey.current = key; synth.speak(said); }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe reaccionar al aviso nuevo
  }, [status, reply, open, speakOn]);

  useEffect(() => { if (open) synth.cancel(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // un aviso proactivo también se lee si la lectura en voz alta está activada (una sola vez por aviso)
  useEffect(() => {
    if (!alert || open || voiceOn || !speakOn || !synth.supported) return;
    const key = `alert:${alert.id}`;
    if (spokenKey.current === key || window.speechSynthesis?.speaking) return;
    spokenKey.current = key;
    synth.speak(stripForSpeech(`${alert.title}. ${alert.text}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe reaccionar a un aviso nuevo
  }, [alert, open, speakOn]);

  // los ojos siguen al cursor (la mirada pesa más en la confianza que los gestos); se apaga con «reducir movimiento»
  useEffect(() => {
    if (calm || open || working) { setLook(null); return undefined; }
    let frame = null;
    const lookAt = (cx, cy) => {
      const r = botRef.current?.getBoundingClientRect();
      if (!r || !r.width) return;
      const clamp = (v) => Math.max(-1, Math.min(1, v));
      setLook({ x: clamp((cx - (r.left + r.width / 2)) / 320), y: clamp((cy - (r.top + r.height * 0.3)) / 240) });
    };
    const onMove = (e) => {
      if (frame) return;
      frame = requestAnimationFrame(() => { frame = null; lookAt(e.clientX, e.clientY); });
    };
    // al entrar a un campo de formulario (con teclado o toque) Logi mira hacia él
    const onFocus = (e) => {
      const el = e.target;
      if (!(el instanceof HTMLElement) || !el.matches('input, select, textarea') || botRef.current?.contains(el)) return;
      const f = el.getBoundingClientRect();
      lookAt(f.left + f.width / 2, f.top + f.height / 2);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('focusin', onFocus);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('focusin', onFocus); if (frame) cancelAnimationFrame(frame); };
  }, [calm, open, working]);

  const toggle = useCallback(() => { setSpeech(''); synth.cancel(); onToggle(); }, [onToggle, synth]);
  if (open || working) return null; // abierto, Logi está en el encabezado del chat

  const voiceMood = voiceOn ? { speaking: 'talking', listening: 'unread', thinking: 'thinking' }[live.phase] : null;
  const mood = voiceMood ?? (synth.speaking ? 'talking' : alert ? (alert.severity === 'high' ? 'worried' : 'unread') : ['confirm', 'thinking', 'unread'].includes(status) ? status : 'idle');
  const nearRight = (pos.x ?? 0) > window.innerWidth / 2;
  const talkingNow = Boolean(speech) && !alert && mood === 'idle';
  const canSpeak = synth.supported && Boolean(speech) && !alert && status !== 'thinking';

  return (
    <div ref={rootRef} className="pointer-events-none fixed inset-x-0 bottom-24 z-40 h-24 lg:bottom-2">
      <div
        ref={botRef}
        className="absolute bottom-0 left-0"
        style={{ transform: `translateX(${pos.x ?? 0}px)`, transition: pos.walking ? `transform ${pos.dur}s linear` : 'none', width: WIDTH }}
      >
        {alert && (
          <div
            role="group"
            aria-label="Aviso de Logi"
            className={`logi-bubble pointer-events-none absolute bottom-full mb-1 w-[17rem] rounded-2xl border bg-white px-4 py-3 shadow-xl ${alert.severity === 'high' ? 'border-amber-300' : 'border-surface-200'} ${nearRight ? 'right-0 rounded-br-md' : 'left-0 rounded-bl-md'}`}
          >
            <p className="text-sm font-bold text-surface-900">{alert.title}</p>
            <p className="mt-1 text-sm leading-snug text-surface-700">{alert.text}</p>
            <div className="pointer-events-auto mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onAlertAccept?.(alert)}
                className="min-h-11 rounded-xl bg-brand-gradient px-3.5 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
              >
                {alert.action?.kind === 'prepare_assign' ? 'Que Logi lo haga' : (alert.action?.label ?? 'Ver')}
              </button>
              <button
                type="button"
                onClick={() => onAlertSnooze?.(alert)}
                className="min-h-11 rounded-xl border border-surface-200 px-3 text-sm font-semibold text-surface-700 hover:bg-surface-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
              >
                Después
              </button>
            </div>
            <button
              type="button"
              onClick={() => onAlertMute?.(alert)}
              className="pointer-events-auto mt-1 min-h-11 text-xs font-medium text-surface-600 underline hover:text-surface-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
            >
              No mostrar este tipo de aviso
            </button>
          </div>
        )}
        {voiceOn && (
          <div className={`logi-bubble absolute bottom-full mb-1 ${nearRight ? 'right-0' : 'left-0'}`}>
            <VoiceStrip live={live} variant="bubble" />
          </div>
        )}
        {speech && !alert && !voiceOn && (
          <div
            className={`logi-bubble pointer-events-none absolute bottom-full mb-1 w-max max-w-[15rem] rounded-2xl border border-surface-200 bg-white px-3.5 py-2.5 text-sm font-medium leading-snug text-surface-800 shadow-lg ${nearRight ? 'right-0 rounded-br-md' : 'left-0 rounded-bl-md'}`}
          >
            <span aria-hidden="true">
              {speech}
              {status === 'thinking' && <span className="ml-1 inline-block animate-pulse motion-reduce:animate-none">···</span>}
            </span>
            {canSpeak && (
              <button
                type="button"
                onClick={() => {
                  if (synth.speaking) { synth.cancel(); if (speakOn) setSpeakOn(false); } else synth.speak(textToRead());
                }}
                className="pointer-events-auto mt-1.5 flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-primary-700 hover:bg-primary-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
              >
                {synth.speaking ? <VolumeX size={14} aria-hidden="true" /> : <Volume2 size={14} aria-hidden="true" />}
                {synth.speaking ? (speakOn ? 'Silenciar a Logi' : 'Detener') : 'Escuchar'}
              </button>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={toggle}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          onFocus={() => setHovered(true)}
          onBlur={() => setHovered(false)}
          className="pointer-events-auto relative block rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
          aria-label={`Abrir asistente IA${text ? `, ${text.toLowerCase()}` : ''}`}
          aria-expanded={open}
          aria-controls={panelId}
          title="Abrir el asistente"
        >
          <span className="block" style={{ transform: `scaleX(${pos.dir === 1 ? -1 : 1})` }}>
            <AssistantAvatar body size={WIDTH} mood={mood} walking={pos.walking} waving={waving || talkingNow} look={look} mouth={voiceOn ? (live.phase === 'speaking' ? live.mouth : null) : synth.speaking ? synth.mouth : null} />
          </span>
          {badge}
        </button>
        {onTogglePause && !calm && (
          <button
            type="button"
            onClick={onTogglePause}
            aria-pressed={!wander}
            aria-label={wander ? 'Pausar el paseo de Logi' : 'Reanudar el paseo de Logi'}
            title={wander ? 'Pausar el paseo de Logi' : 'Reanudar el paseo de Logi'}
            className="pointer-events-auto absolute -right-3 top-6 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-surface-200 bg-white/95 text-surface-700 shadow-md before:absolute before:-inset-1.5 before:content-[''] hover:bg-surface-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
          >
            {wander ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
          </button>
        )}
        {alert && <p role="status" className="sr-only">{`${alert.title}. ${alert.text}`}</p>}
      </div>
    </div>
  );
}

export default LogiCompanion;
