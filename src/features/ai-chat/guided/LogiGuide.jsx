import { useEffect, useState } from 'react';
import AssistantAvatar from '../components/AssistantAvatar';

/**
 * Logi caminando por la pantalla mientras hace una acción: se acerca al campo que está llenando y lo cuenta en un globo.
 * Es solo imagen (no recibe clics: la capa de interrupción está por debajo y el aviso con «Detener» por encima).
 */
function LogiGuide({ ui }) {
  const { x, y, dur, moving, say, mood } = ui;
  // El lado del globo se decide cuando Logi LLEGA (no según su destino mientras camina): así nunca se sale de la pantalla
  const [nearRight, setNearRight] = useState(() => x > window.innerWidth - 300);
  useEffect(() => { if (!moving) setNearRight(x > window.innerWidth - 300); }, [x, moving]);
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[1300]"
      style={{ transform: `translate(${Math.round(x)}px, ${Math.round(y)}px)`, transition: dur ? `transform ${dur}ms ease-in-out` : 'none' }}
    >
      {say && (
        <div className={`logi-bubble absolute bottom-full mb-1 w-max max-w-[16rem] rounded-2xl border border-surface-200 bg-white px-3.5 py-2.5 text-sm font-medium leading-snug text-surface-800 shadow-xl ${nearRight ? 'right-0 rounded-br-md' : 'left-0 rounded-bl-md'}`}>
          {say}
        </div>
      )}
      <AssistantAvatar body size={64} mood={mood} walking={moving} />
    </div>
  );
}

export default LogiGuide;
