import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

const createVehicleIcon = (isFinished = false) => L.divIcon({
  className: 'custom-vehicle-marker',
  html: `
    <div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;inset:0;border-radius:9999px;background:${isFinished ? 'rgba(71,85,105,0.1)' : 'rgba(19,127,236,0.18)'};${isFinished ? '' : 'animation:pulse-ring 2s infinite;'}"></div>
      <div style="
        position:relative;
        width:30px;
        height:30px;
        border-radius:10px;
        background:linear-gradient(135deg,${isFinished ? '#475569 0%,#64748b 100%' : '#1a5fb4 0%,#3b82f6 100%'});
        border:2px solid #ffffff;
        box-shadow:0 4px 12px ${isFinished ? 'rgba(0,0,0,0.2)' : 'rgba(59,130,246,0.4)'};
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:18px;
      ">
        ${isFinished ? '📦' : '🚛'}
      </div>
    </div>
    <style>
      @keyframes pulse-ring {
        0% { transform: scale(0.92); opacity: 0.8; }
        70% { transform: scale(1.35); opacity: 0; }
        100% { transform: scale(1.35); opacity: 0; }
      }
    </style>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20],
});

function VehicleMarker({ position, title = 'Vehiculo', subtitle, onClick, isFinished = false }) {
  if (!position) return null;

  return (
    <Marker
      position={position}
      icon={createVehicleIcon(isFinished)}
      eventHandlers={{ click: () => onClick?.(position) }}
    >
      <Popup>
        <div className="min-w-[180px] p-1">
          <h3 className="text-sm font-semibold text-surface-900">{title}</h3>
          {subtitle && <p className="mt-1 text-xs text-surface-500">{subtitle}</p>}
          <p className="mt-3 text-xs text-surface-500">Lat: {position[0].toFixed(6)}</p>
          <p className="text-xs text-surface-500">Lng: {position[1].toFixed(6)}</p>
          {isFinished && <p className="mt-2 text-[10px] font-bold text-emerald-600 uppercase">Viaje Finalizado</p>}
        </div>
      </Popup>
    </Marker>
  );
}

export default VehicleMarker;