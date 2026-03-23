import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

const truckSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-5l-4-3h-3v10"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>`;
const packageSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16.5 9.4 7.5 4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.27 6.96 8.73 5.04 8.73-5.04"/><path d="M12 22.08V12"/></svg>`;

const createVehicleIcon = (isFinished = false) => L.divIcon({
  className: 'custom-vehicle-marker',
  html: `
    <div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;inset:4px;border-radius:9999px;background:${isFinished ? 'rgba(71,85,105,0.1)' : 'rgba(19,127,236,0.15)'};${isFinished ? '' : 'animation:pulse-ring 2s infinite;'}"></div>
      <div style="
        position:relative;
        width:34px;
        height:34px;
        border-radius:12px;
        background:linear-gradient(135deg,${isFinished ? '#475569 0%,#334155 100%' : '#137fec 0%,#2563eb 100%'});
        border:2.5px solid #ffffff;
        box-shadow:0 8px 20px ${isFinished ? 'rgba(0,0,0,0.25)' : 'rgba(19,127,236,0.45)'};
        display:flex;
        align-items:center;
        justify-content:center;
        color: white;
      ">
        ${isFinished ? packageSvg : truckSvg}
      </div>
    </div>
    <style>
      @keyframes pulse-ring {
        0% { transform: scale(0.85); opacity: 0.8; }
        70% { transform: scale(1.4); opacity: 0; }
        100% { transform: scale(1.4); opacity: 0; }
      }
    </style>
  `,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
  popupAnchor: [0, -22],
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
          <div className="mt-3 flex gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-surface-400 font-bold">Latitud</p>
              <p className="text-xs font-mono text-surface-700">{(Array.isArray(position) ? position[0] : position.lat)?.toFixed(6)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-surface-400 font-bold">Longitud</p>
              <p className="text-xs font-mono text-surface-700">{(Array.isArray(position) ? position[1] : position.lng)?.toFixed(6)}</p>
            </div>
          </div>
          {isFinished && <p className="mt-2 text-[10px] font-bold text-emerald-600 uppercase">Viaje Finalizado</p>}
        </div>
      </Popup>
    </Marker>
  );
}

export default VehicleMarker;