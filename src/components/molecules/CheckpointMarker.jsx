import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

const checkpointIcon = (sequence = 1) => L.divIcon({
  className: 'custom-checkpoint-marker',
  html: `
    <div style="position:relative;width:28px;height:28px;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;inset:0;border-radius:9999px;background:rgba(245,158,11,0.2);"></div>
      <div style="position:relative;width:22px;height:22px;border-radius:9999px;background:#f59e0b;border:2px solid #ffffff;color:#ffffff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;box-shadow:0 10px 22px rgba(245,158,11,0.4);">${sequence}</div>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
});

function CheckpointMarker({ checkpoint, onClick }) {
  const position = [checkpoint.lat, checkpoint.lng];

  return (
    <Marker
      position={position}
      icon={checkpointIcon(checkpoint.sequence_order || 1)}
      eventHandlers={{ click: () => onClick?.(checkpoint) }}
    >
      <Popup>
        <div className="min-w-[180px] p-1">
          <h3 className="text-sm font-semibold text-surface-900">{checkpoint.name}</h3>
          <p className="mt-1 text-xs text-surface-500">Checkpoint {checkpoint.sequence_order}</p>
          <div className="mt-3 space-y-1 text-xs text-surface-500">
            <p>Lat: {checkpoint.lat.toFixed(6)}</p>
            <p>Lng: {checkpoint.lng.toFixed(6)}</p>
            <p>Radio: {checkpoint.radius_meters} m</p>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

export default CheckpointMarker;