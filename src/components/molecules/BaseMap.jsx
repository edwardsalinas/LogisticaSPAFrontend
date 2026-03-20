import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * Componente base para mapas con Leaflet
 * Usa OpenStreetMap como proveedor de tiles (gratis)
 */
function BaseMap({ 
  center = [-16.5, -68.15], // La Paz, Bolivia por defecto
  zoom = 10,
  minZoom = 5,
  maxZoom = 18,
  children,
  className = 'h-full w-full rounded-lg',
  scrollWheelZoom = true,
}) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      minZoom={minZoom}
      maxZoom={maxZoom}
      scrollWheelZoom={scrollWheelZoom}
      className={className}
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {children}
    </MapContainer>
  );
}

export default BaseMap;
