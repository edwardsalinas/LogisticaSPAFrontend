import { useState, useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { mockApi } from '../../../services/api.mock';
import CheckpointAlert from '../../../components/molecules/CheckpointAlert';

/**
 * Componente para tracking en vivo de un paquete
 * Polling de posición cada 5 segundos y detección automática de checkpoints
 */
function LiveTracker({ packageId, routeId }) {
  const map = useMap();
  const [position, setPosition] = useState(null);
  const [history, setHistory] = useState([]);
  const [checkpointAlert, setCheckpointAlert] = useState(null);
  const [lastCheckpointId, setLastCheckpointId] = useState(null);
  const [error, setError] = useState(null);
  const markerRef = useRef(null);
  const intervalRef = useRef(null);

  // Función para obtener la última posición
  const fetchPosition = async () => {
    try {
      const res = await mockApi.getTrackingLogs(packageId);
      const logs = res.data || [];
      
      if (logs.length > 0) {
        const latestLog = logs[0];
        const newPosition = { lat: latestLog.lat, lng: latestLog.lng };
        
        setPosition(newPosition);
        setHistory(logs);

        // Verificar si pasó por algún checkpoint
        if (routeId) {
          const geofenceRes = await mockApi.checkGeofence({
            lat: latestLog.lat,
            lng: latestLog.lng,
            package_id: packageId,
          });

          if (
            geofenceRes.data.within_checkpoint &&
            geofenceRes.data.checkpoint.id !== lastCheckpointId
          ) {
            setCheckpointAlert({
              ...geofenceRes.data.checkpoint,
              distance_meters: geofenceRes.data.distance_meters,
            });
            setLastCheckpointId(geofenceRes.data.checkpoint.id);
          }
        }

        // Mover el mapa suavemente a la nueva posición
        map.flyTo([newPosition.lat, newPosition.lng], 13, {
          duration: 1.5,
        });

        setError(null);
      }
    } catch (err) {
      console.error('Error obteniendo posición:', err);
      setError('No se pudo obtener la posición del vehículo');
    }
  };

  useEffect(() => {
    // Obtener posición inicial inmediatamente
    fetchPosition();

    // Polling cada 5 segundos
    intervalRef.current = setInterval(fetchPosition, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [packageId, routeId, lastCheckpointId]);

  return (
    <>
      {/* Alerta de checkpoint */}
      {checkpointAlert && (
        <CheckpointAlert
          checkpoint={checkpointAlert}
          onDismiss={() => setCheckpointAlert(null)}
        />
      )}

      {/* Información de tracking */}
      <div className="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-lg p-4 min-w-[200px]">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 bg-success rounded-full animate-pulse" />
          <span className="text-sm font-semibold text-surface-800">En Vivo</span>
        </div>
        {position ? (
          <div className="space-y-1 text-sm">
            <p className="text-surface-600">
              📍 {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
            </p>
            <p className="text-xs text-surface-400">
              🕐 Actualizado: {new Date().toLocaleTimeString()}
            </p>
            <p className="text-xs text-surface-400">
              📊 {history.length} registros
            </p>
          </div>
        ) : (
          <p className="text-sm text-surface-400">Esperando señal...</p>
        )}
        {error && (
          <p className="text-xs text-danger mt-2">{error}</p>
        )}
      </div>

      {/* Marcador del vehículo (se renderiza en el padre) */}
      {position && (
        <VehicleMarker
          ref={markerRef}
          position={[position.lat, position.lng]}
          title="Vehículo en Tránsito"
          subtitle={`Última actualización: ${new Date().toLocaleTimeString()}`}
        />
      )}
    </>
  );
}

// Importar VehicleMarker aquí para evitar circular dependency
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

const vehicleIcon = L.divIcon({
  className: 'custom-vehicle-marker',
  html: `
    <div style="
      background-color: #137fec;
      border: 3px solid white;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      box-shadow: 0 2px 12px rgba(19, 127, 236, 0.4);
      animation: pulse 2s infinite;
    ">
      🚛
    </div>
    <style>
      @keyframes pulse {
        0% {
          box-shadow: 0 0 0 0 rgba(19, 127, 236, 0.7);
        }
        70% {
          box-shadow: 0 0 0 10px rgba(19, 127, 236, 0);
        }
        100% {
          box-shadow: 0 0 0 0 rgba(19, 127, 236, 0);
        }
      }
    </style>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

const VehicleMarker = ({ position, title, subtitle }) => (
  <Marker position={position} icon={vehicleIcon}>
    <Popup>
      <div className="p-2">
        <h3 className="font-semibold text-surface-800">{title}</h3>
        {subtitle && <p className="text-sm text-surface-500 mt-1">{subtitle}</p>}
      </div>
    </Popup>
  </Marker>
);

export default LiveTracker;
