import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function BaseMap({
  center = [-16.5, -68.15],
  zoom = 10,
  minZoom = 5,
  maxZoom = 18,
  children,
  className = 'h-full w-full rounded-lg',
  scrollWheelZoom = true,
  ariaLabel = 'Mapa operativo',
}) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="pointer-events-none absolute inset-0 z-[300] bg-[radial-gradient(circle_at_top_right,rgba(19,127,236,0.12),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.08),transparent_20%,rgba(6,17,31,0.03)_100%)]" />
      <MapContainer
        center={center}
        zoom={zoom}
        minZoom={minZoom}
        maxZoom={maxZoom}
        scrollWheelZoom={scrollWheelZoom}
        className={className}
        zoomControl={false}
        attributionControl={false}
        aria-label={ariaLabel}
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
          maxZoom={19}
        />
        {children}
      </MapContainer>
      <div className="pointer-events-none absolute bottom-3 right-3 z-[350] rounded-full border border-white/70 bg-white/90 px-3 py-1.5 text-xs font-semibold text-surface-500 shadow-sm backdrop-blur-sm">
        &copy; OpenStreetMap
      </div>
    </div>
  );
}

export default BaseMap;
