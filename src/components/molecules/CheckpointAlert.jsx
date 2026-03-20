import { useEffect, useState } from 'react';

/**
 * Notificación visual cuando un vehículo pasa por un checkpoint
 */
function CheckpointAlert({ checkpoint, onDismiss }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Auto-dismiss después de 5 segundos
    const timer = setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!isVisible || !checkpoint) return null;

  return (
    <div className="fixed top-4 right-4 z-[2000] animate-slide-in-right">
      <div className="bg-success text-white rounded-lg shadow-lg p-4 min-w-[300px]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">✅</span>
              <strong className="font-semibold">Checkpoint Alcanzado</strong>
            </div>
            <p className="text-sm text-green-50 mb-1">{checkpoint.name}</p>
            <p className="text-xs text-green-100">
              📍 {checkpoint.distance_meters?.toFixed(1)}m del centro
            </p>
          </div>
          <button
            onClick={() => {
              setIsVisible(false);
              onDismiss?.();
            }}
            className="text-green-100 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

export default CheckpointAlert;
