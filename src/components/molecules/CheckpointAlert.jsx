import { CheckCircle2, MapPinned, X } from 'lucide-react';
import { useEffect, useState } from 'react';

function CheckpointAlert({ checkpoint, onDismiss }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!isVisible || !checkpoint) return null;

  return (
    <div className="fixed right-4 top-4 z-[2000] w-[min(92vw,360px)] animate-[fadeIn_0.25s_ease-out]">
      <div className="rounded-[1.4rem] border border-emerald-200/80 bg-white/95 p-4 shadow-[0_26px_60px_-34px_rgba(16,185,129,0.35)] backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <CheckCircle2 size={18} strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[0.62rem] uppercase tracking-[0.18em] text-emerald-600">Checkpoint alcanzado</p>
                <h3 className="mt-1 text-sm font-semibold text-surface-950">{checkpoint.name}</h3>
              </div>
              <button onClick={() => { setIsVisible(false); onDismiss?.(); }} className="text-surface-400 transition-colors hover:text-surface-700">
                <X size={16} strokeWidth={2.2} />
              </button>
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-surface-500"><MapPinned size={13} strokeWidth={2.2} /> Distancia al centro: {checkpoint.distance_meters?.toFixed(1)} m</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CheckpointAlert;