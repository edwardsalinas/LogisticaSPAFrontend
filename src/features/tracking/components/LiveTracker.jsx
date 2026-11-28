import { Activity, Clock3, MapPinned, TriangleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';
import VehicleMarker from '../../../components/molecules/VehicleMarker';
import apiService from '../../../services/apiService';

function LiveTracker({ packageId }) {
  const map = useMap();
  const [position, setPosition] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let intervalId;
    let isMounted = true;

    const fetchPosition = async () => {
      try {
        const res = await apiService.getTrackingLogs(packageId);
        const logs = res.data || [];
        if (!isMounted || logs.length === 0) return;

        const latestLog = logs[0];
        const newPosition = { lat: latestLog.lat, lng: latestLog.lng };
        setPosition(newPosition);
        setHistory(logs);

        // OPTIMIZACIÓN: Si el paquete ya está entregado, detener el intervalo (con delay para UX)
        const statusLower = latestLog.status.toLowerCase();
        if (statusLower.includes('entregado') || statusLower.includes('delivered')) {
          console.log('[LiveTracker] Paquete entregado. Programando detencion de seguimiento.');
          setTimeout(() => {
            if (isMounted) {
              console.log('[LiveTracker] Deteniendo seguimiento activo.');
              clearInterval(intervalId);
            }
          }, 5000);
        }

        // La geocerca de los puntos de control la evalúa el servidor al recibir cada posición del conductor: aquí solo se muestra.

        map.flyTo([newPosition.lat, newPosition.lng], 13, { duration: 1.4 });
        setError(null);
      } catch (err) {
        console.error('Error obteniendo posicion:', err);
        if (isMounted) setError('No se pudo obtener la posición actual');
      }
    };

    fetchPosition();
    intervalId = setInterval(fetchPosition, 5000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [map, packageId]);

  return (
    <>
      <div className="pointer-events-none absolute left-4 top-4 z-[1000] w-[min(92vw,320px)]">
        <div className="pointer-events-auto rounded-[1.5rem] border border-white/70 bg-white/92 p-4 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.3)] backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <Activity size={18} strokeWidth={2.2} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-surface-500">Tracking en vivo</p>
                  <h3 className="mt-1 text-sm font-semibold text-surface-950">Senal operativa activa</h3>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live
                </span>
              </div>

              {position ? (
                <div className="mt-3 space-y-2 text-xs text-surface-500">
                  <p className="flex items-center gap-1.5"><MapPinned size={13} strokeWidth={2.2} /> {position.lat.toFixed(6)}, {position.lng.toFixed(6)}</p>
                  <p className="flex items-center gap-1.5"><Clock3 size={13} strokeWidth={2.2} /> Actualizado {new Date().toLocaleTimeString('es-BO')}</p>
                  <p>{history.length} registros disponibles</p>
                </div>
              ) : (
                <p className="mt-3 text-xs text-surface-500">Esperando señal de posición...</p>
              )}

              {error && <p className="mt-3 flex items-center gap-1.5 text-xs text-red-600"><TriangleAlert size={13} strokeWidth={2.2} /> {error}</p>}
            </div>
          </div>
        </div>
      </div>

      {position && (
        <VehicleMarker
          position={[position.lat, position.lng]}
          title="Vehículo en tránsito"
          subtitle={`Actualizado ${new Date().toLocaleTimeString('es-BO')}`}
        />
      )}
    </>
  );
}

export default LiveTracker;