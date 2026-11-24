import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import AssistantAvatar from './AssistantAvatar';
import { prefersReducedMotion } from '../voice';

const WIDTH = 60; // ancho del robot en pantalla (px)
const MARGIN = 12;
const SPEED = 70; // px por segundo al caminar
const GREETING_KEY = 'logi:saludo';

const rand = (min, max) => min + Math.random() * (max - min);
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

/** Primera frase de una respuesta, sin marcas de formato, para el globo de texto. */
export const speechFromReply = (text) => {
  const plain = String(text ?? '')
    .replace(/[`*_#>|]/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  if (!plain) return '';
  const sentence = plain.match(/^.{12,}?[.!?](\s|$)/)?.[0].trim() ?? plain;
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
 */
function LogiCompanion({ open, status, text, reply, wander = true, onToggle, panelId, badge }) {
  const rootRef = useRef(null);
  const botRef = useRef(null);
  const xRef = useRef(null);
  const [pos, setPos] = useState({ x: null, dur: 0, dir: -1, walking: false });
  const [hovered, setHovered] = useState(false);
  const [speech, setSpeech] = useState('');
  const [waving, setWaving] = useState(false);
  const calm = prefersReducedMotion();

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
  const roaming = wander && !calm && !open && status === 'idle' && !hovered && !speech;

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
      if (Math.abs(target - cur) < 90) target = clamp(cur + (Math.random() < 0.5 ? -1 : 1) * rand(120, 260), MARGIN, max);
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
    const t = setTimeout(() => setSpeech(''), 9000);
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

  const toggle = useCallback(() => { setSpeech(''); onToggle(); }, [onToggle]);
  if (open) return null; // abierto, Logi está en el encabezado del chat

  const mood = ['confirm', 'thinking', 'unread'].includes(status) ? status : 'idle';
  const nearRight = (pos.x ?? 0) > window.innerWidth / 2;
  const talkingNow = Boolean(speech) && mood === 'idle';

  return (
    <div ref={rootRef} className="pointer-events-none fixed inset-x-0 bottom-24 z-40 h-24 lg:bottom-2">
      <div
        ref={botRef}
        className="absolute bottom-0 left-0"
        style={{ transform: `translateX(${pos.x ?? 0}px)`, transition: pos.walking ? `transform ${pos.dur}s linear` : 'none', width: WIDTH }}
      >
        {speech && (
          <div
            aria-hidden="true"
            className={`logi-bubble pointer-events-none absolute bottom-full mb-1 w-max max-w-[15rem] rounded-2xl border border-surface-200 bg-white px-3.5 py-2.5 text-sm font-medium leading-snug text-surface-800 shadow-lg ${nearRight ? 'right-0 rounded-br-md' : 'left-0 rounded-bl-md'}`}
          >
            {speech}
            {status === 'thinking' && <span className="ml-1 inline-block animate-pulse motion-reduce:animate-none">···</span>}
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
            <AssistantAvatar body size={WIDTH} mood={mood} walking={pos.walking} waving={waving || talkingNow} />
          </span>
          {badge}
        </button>
      </div>
    </div>
  );
}

export default LogiCompanion;
