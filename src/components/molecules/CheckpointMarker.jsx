import { Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

/**
 * Icono personalizado para checkpoints
 */
const checkpointIcon = L.divIcon({
  className: 'custom-checkpoint-marker',
  html: `
    <div style="
      background-color: #f59e0b;
      border: 3px solid white;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">
      🚩
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

/**
 * Componente para marcar un checkpoint en el mapa
 */
function CheckpointMarker({ checkpoint, onClick }) {
  const position = [checkpoint.lat, checkpoint.lng];

  return (
    <Marker 
      position={position} 
      icon={checkpointIcon}
      eventHandlers={{
        click: () => onClick?.(checkpoint),
      }}
    >
      <Popup>
        <div className="p-2">
          <h3 className="font-semibold text-surface-800">{checkpoint.name}</h3>
          <p className="text-sm text-surface-500 mt-1">
            📍 {checkpoint.lat.toFixed(6)}, {checkpoint.lng.toFixed(6)}
          </p>
          <p className="text-xs text-surface-400 mt-1">
            Radio: {checkpoint.radius_meters}m
          </p>
          <p className="text-xs text-surface-400">
            Secuencia: {checkpoint.sequence_order}
          </p>
        </div>
      </Popup>
    </Marker>
  );
}

export default CheckpointMarker;
