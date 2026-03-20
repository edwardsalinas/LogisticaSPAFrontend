import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

const vehicleIcon = L.divIcon({
  className: 'custom-vehicle-marker',
  html: `
    <div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;inset:0;border-radius:9999px;background:rgba(19,127,236,0.18);animation:pulse-ring 2s infinite;"></div>
      <div style="position:relative;width:18px;height:18px;transform:rotate(45deg);border-radius:5px;background:linear-gradient(135deg,#0b4ea2 0%,#137fec 100%);border:3px solid #ffffff;box-shadow:0 10px 24px rgba(19,127,236,0.5);"></div>
    </div>
    <style>
      @keyframes pulse-ring {
        0% { transform: scale(0.92); opacity: 0.8; }
        70% { transform: scale(1.28); opacity: 0; }
        100% { transform: scale(1.28); opacity: 0; }
      }
    </style>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18],
});

function VehicleMarker({ position, title = 'Vehiculo', subtitle, onClick }) {
  if (!position) return null;

  return (
    <Marker
      position={position}
      icon={vehicleIcon}
      eventHandlers={{ click: () => onClick?.(position) }}
    >
      <Popup>
        <div className="min-w-[180px] p-1">
          <h3 className="text-sm font-semibold text-surface-900">{title}</h3>
          {subtitle && <p className="mt-1 text-xs text-surface-500">{subtitle}</p>}
          <p className="mt-3 text-xs text-surface-500">Lat: {position[0].toFixed(6)}</p>
          <p className="text-xs text-surface-500">Lng: {position[1].toFixed(6)}</p>
        </div>
      </Popup>
    </Marker>
  );
}

export default VehicleMarker;