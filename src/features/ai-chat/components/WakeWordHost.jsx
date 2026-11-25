import { Mic } from 'lucide-react';
import { toast } from 'sonner';
import { useGuidedRun } from '../guided/GuidedRunProvider';
import { useVoiceDock, voiceDock } from '../voiceDock';
import useWakeWord from '../useWakeWord';
import { setWakeEnabled, useWakeEnabled } from '../wakePref';

/**
 * «Hey Logi», en el layout. Si la persona lo activó, escucha la frase de activación y abre el chat de voz (barra compacta),
 * ya atendiendo lo que dijo a continuación («hey Logi, ayúdame a crear un paquete»). Mientras escucha SIEMPRE se ve un
 * aviso de que el micrófono está abierto, con el botón para apagarlo: nada de micrófono escondido.
 */
export default function WakeWordHost() {
  const enabled = useWakeEnabled();
  const dock = useVoiceDock();
  const guided = useGuidedRun();
  const { supported, listening } = useWakeWord({
    enabled,
    paused: dock.open || Boolean(guided?.active), // el chat de voz y Logi trabajando usan el micrófono
    onWake: (rest) => voiceDock.open({ initial: rest, wake: true }),
    onFatal: () => {
      setWakeEnabled(false);
      toast.error('No pude usar el micrófono para «Hey Logi»', { description: 'Revisa el permiso del micrófono en el navegador y vuelve a activarlo.' });
    },
  });

  if (!enabled || !supported) return null;
  return (
    <div
      role="status"
      data-testid="wake-indicator"
      className="fixed bottom-24 left-3 z-40 flex items-center gap-2 rounded-full border border-surface-200 bg-white/95 py-1 pl-3 pr-1 text-xs font-medium text-surface-700 shadow-lg backdrop-blur lg:bottom-4 lg:left-[18.5rem]"
    >
      <span aria-hidden="true" className={`flex h-2.5 w-2.5 rounded-full ${listening ? 'bg-emerald-500' : 'bg-amber-400'}`} />
      <Mic size={14} aria-hidden="true" />
      <span>{dock.open ? 'Chat de voz abierto' : listening ? 'Di «Hey Logi» · micrófono abierto' : 'Hey Logi: reconectando…'}</span>
      <button
        type="button"
        onClick={() => setWakeEnabled(false)}
        className="min-h-9 rounded-full px-3 font-semibold text-primary-700 hover:bg-primary-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
      >
        Apagar
      </button>
    </div>
  );
}
