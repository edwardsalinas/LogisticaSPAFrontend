import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

/**
 * Icono animado para vehículo en movimiento
 */
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

/**
 * Componente para marcar la posición de un vehículo/paquete en el mapa
 */
function VehicleMarker({ position, title = 'Vehículo', subtitle, onClick }) {
  if (!position) return null;

  return (
    <Marker 
      position={position} 
      icon={vehicleIcon}
      eventHandlers={{
        click: () => onClick?.(position),
      }}
    >
      <Popup>
        <div className="p-2">
          <h3 className="font-semibold text-surface-800">{title}</h3>
          {subtitle && (
            <p className="text-sm text-surface-500 mt-1">{subtitle}</p>
          )}
          <p className="text-xs text-surface-400 mt-2">
            📍 {position[0].toFixed(6)}, {position[1].toFixed(6)}
          </p>
        </div>
      </Popup>
    </Marker>
  );
}

export default VehicleMarker;
