import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

const createIcon = (type) => {
  const isOrigin = type === 'origin';
  const colorClass = isOrigin ? 'bg-blue-600' : 'bg-red-500';
  const shadowClass = isOrigin ? 'shadow-blue-500/40' : 'shadow-red-500/40';
  // Lucide MapPin (Origin) and Flag (Dest) SVGs explicitly hardcoded for Leaflet divIcon text injections without React overhead
  const svg = isOrigin 
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>`;

  return L.divIcon({
    className: 'custom-origin-dest-marker',
    html: `<div class="flex h-8 w-8 items-center justify-center rounded-[12px] ${colorClass} text-white shadow-lg ${shadowClass} border-[2px] border-white/90 backdrop-blur-md">${svg}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

function OriginDestMarker({ type, position, title, subtitle }) {
  if (!position || !position[0] || !position[1]) return null;
  return (
    <Marker position={position} icon={createIcon(type)}>
      <Popup>
        <div className="p-1 min-w-[140px]">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-surface-500">{type === 'origin' ? 'Origen' : 'Destino'}</p>
          <h3 className="mt-1 text-sm font-semibold text-surface-900 leading-tight">{title}</h3>
          {subtitle && <p className="mt-[2px] text-xs text-surface-600">{subtitle}</p>}
        </div>
      </Popup>
    </Marker>
  );
}

export default OriginDestMarker;
