import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import BaseMap from '../../../components/molecules/BaseMap';
import CheckpointMarker from '../../../components/molecules/CheckpointMarker';
import RoutePath from '../../../components/molecules/RoutePath';
import LiveTracker from './LiveTracker';

const lastKnownIcon = L.divIcon({
  className: 'custom-last-known-marker',
  html: `
    <div style="position:relative;width:34px;height:34px;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;inset:0;border-radius:9999px;background:rgba(99,102,241,0.16);"></div>
      <div style="position:relative;width:16px;height:16px;border-radius:9999px;background:#6366f1;border:3px solid #ffffff;box-shadow:0 10px 24px rgba(99,102,241,0.38);"></div>
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -17],
});

function PackageTrackingMap({ center, packageId, routeId, checkpoints = [], latestPosition }) {
  return (
    <BaseMap center={center} zoom={9} className="h-full w-full">
      <LiveTracker packageId={packageId} routeId={routeId} />
      {checkpoints.length > 0 && (
        <>
          <RoutePath checkpoints={checkpoints} />
          {checkpoints.map((cp) => <CheckpointMarker key={cp.id} checkpoint={cp} />)}
        </>
      )}
      {latestPosition && (
        <Marker position={[latestPosition.lat, latestPosition.lng]} icon={lastKnownIcon}>
          <Popup>
            <div className="min-w-[180px] p-1">
              <h3 className="text-sm font-semibold text-surface-900">Ultima posicion conocida</h3>
              <p className="mt-1 text-xs text-surface-500">{new Date(latestPosition.timestamp).toLocaleString('es-BO')}</p>
              <p className="mt-3 text-xs text-surface-500">Estado: {latestPosition.status}</p>
            </div>
          </Popup>
        </Marker>
      )}
    </BaseMap>
  );
}

export default PackageTrackingMap;