import { CircleMarker, useMapEvents } from 'react-leaflet';
import BaseMap from '../../../components/molecules/BaseMap';

function ClickCatcher({ onPick }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

/** Mapa para marcar una ubicación con un clic. Se carga bajo demanda (Leaflet pesa). */
export default function LocationMap({ lat, lng, onPick }) {
  const has = Number.isFinite(lat) && Number.isFinite(lng);
  return (
    <div className="h-64 overflow-hidden rounded-2xl border border-surface-200" role="group" aria-label="Mapa para marcar la ubicación">
      <BaseMap center={has ? [lat, lng] : [-16.5, -68.15]} zoom={has ? 11 : 6} ariaLabel="Haz clic en el mapa para marcar la ubicación">
        <ClickCatcher onPick={onPick} />
        {has && <CircleMarker center={[lat, lng]} radius={9} pathOptions={{ color: '#0b4ea2', fillColor: '#137fec', fillOpacity: 0.9 }} />}
      </BaseMap>
    </div>
  );
}
