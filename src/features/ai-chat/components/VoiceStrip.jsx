import { Maximize2, Mic, Square, Volume2, X } from 'lucide-react';

const PHASE_TEXT = {
  idle: 'Toca el micrófono para hablar',
  listening: 'Te escucho…',
  thinking: 'Pensando…',
  speaking: 'Hablando… toca para interrumpir',
};

/**
 * La voz de Logi, a la vista: lo que oye, lo que dice y la confirmación pendiente. No es una ventana aparte: se dibuja dentro
 * del chat (variant «panel», bajo el Logi del encabezado) o en el globo de Logi (variant «bubble»), alimentada por lo que
 * publica el motor de voz (voiceDock.publish). Los controles vienen en live.controls.
 */
export default function VoiceStrip({ live, variant = 'panel' }) {
  const { phase, caption, pending, notice, error, assisting, handsFree, supported, reply, controls } = live;
  const bubble = variant === 'bubble';
  const label = assisting && phase === 'idle' ? 'Logi te está ayudando' : PHASE_TEXT[phase];
  const ring = phase === 'listening' ? 'bg-sky-400/30' : 'bg-emerald-400/25';
  const orbColor = phase === 'listening' ? 'bg-sky-600' : phase === 'speaking' ? 'bg-emerald-600' : phase === 'thinking' ? 'bg-violet-600' : 'bg-primary-600';

  return (
    <section
      aria-label="Chat de voz"
      data-testid="voice-compact"
      className={bubble
        ? 'pointer-events-auto w-[17rem] rounded-2xl border border-surface-200 bg-white p-3 text-surface-800 shadow-xl'
        : 'border-t border-surface-100 bg-sky-50/70 px-4 py-3 text-surface-800'}
    >
      <div className="flex items-start gap-3">
        {supported ? (
          <button
            type="button"
            onClick={() => controls.orb()}
            aria-label={phase === 'listening' ? 'Dejar de escuchar' : 'Hablar'}
            className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-primary-300"
          >
            {(phase === 'listening' || phase === 'speaking') && <span aria-hidden="true" className={`absolute inset-0 rounded-full ${ring} animate-ping motion-reduce:animate-none`} />}
            <span aria-hidden="true" className={`relative flex h-10 w-10 items-center justify-center rounded-full text-white ${orbColor} ${phase === 'thinking' ? 'animate-pulse motion-reduce:animate-none' : ''}`}>
              {phase === 'speaking' ? <Volume2 size={19} /> : phase === 'listening' ? <Square size={15} fill="currentColor" /> : <Mic size={19} />}
            </span>
          </button>
        ) : (
          <p role="alert" className="text-xs text-amber-800">Tu navegador no permite reconocimiento de voz. Usa Chrome o Edge.</p>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p data-testid="voice-phase" role="status" className="pt-1 text-sm font-semibold text-primary-700">{label}</p>
            <div className="flex shrink-0 gap-0.5">
              {controls.expand && <button type="button" onClick={() => controls.expand()} aria-label="Pantalla completa" title="Pantalla completa" className="flex h-9 w-9 items-center justify-center rounded-lg text-surface-600 hover:bg-white"><Maximize2 size={15} aria-hidden="true" /></button>}
              <button type="button" onClick={() => controls.close()} aria-label="Salir del chat de voz" className="flex h-9 w-9 items-center justify-center rounded-lg text-surface-600 hover:bg-white"><X size={17} aria-hidden="true" /></button>
            </div>
          </div>
          <div className="text-sm leading-snug" aria-live="polite">
            {caption && <p aria-hidden="true" className="font-medium text-surface-900">“{caption}”</p>}
            {!caption && bubble && reply && <p className="line-clamp-4 text-surface-700">{reply}</p>}
            {!caption && assisting && <p className="text-surface-600 max-sm:hidden">Responde en voz alta; puedes corregir escribiendo en la pantalla.</p>}
            {error && <p role="alert" className="font-semibold text-amber-700">{error}</p>}
            {notice && <p className="text-surface-600">{notice}</p>}
          </div>
        </div>
      </div>
      {pending && (
        <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-left">
          <p className="text-sm font-semibold text-amber-900">{pending.title}</p>
          <ul className="mt-1 space-y-0.5 text-xs text-amber-900/90">{(pending.lines ?? []).map((line) => <li key={line}>{line}</li>)}</ul>
          <p className="mt-2 text-xs font-semibold text-amber-900">Di «sí, hazlo» o «cancela».</p>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => controls.answer('sí')} className="min-h-11 flex-1 rounded-xl bg-emerald-600 px-3 text-sm font-bold text-white hover:bg-emerald-700">Sí, hazlo</button>
            <button type="button" onClick={() => controls.answer('cancela')} className="min-h-11 flex-1 rounded-xl border border-surface-300 bg-white px-3 text-sm font-bold text-surface-800 hover:bg-surface-50">Cancelar</button>
          </div>
        </div>
      )}
      <label className="mt-1 flex min-h-11 cursor-pointer items-center gap-2 text-xs text-surface-700">
        <input type="checkbox" checked={handsFree} onChange={(e) => controls.handsFree(e.target.checked)} className="h-5 w-5 rounded" />
        Manos libres
      </label>
      {!bubble && <p className="mt-1 text-[11px] leading-snug text-surface-600 max-sm:hidden">Prueba: «ayúdame a crear un paquete» o «llévame a Viajes». Chrome procesa el audio en servidores de Google; el asistente solo recibe el texto.</p>}
    </section>
  );
}
