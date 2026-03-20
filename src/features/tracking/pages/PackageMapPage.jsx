import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import BaseMap from '../../../components/molecules/BaseMap';
import RoutePath from '../../../components/molecules/RoutePath';
import CheckpointMarker from '../../../components/molecules/CheckpointMarker';
import LiveTracker from '../components/LiveTracker';
import Spinner from '../../../components/atoms/Spinner';
import Button from '../../../components/atoms/Button';
import { mockApi } from '../../../services/api.mock';

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
    ">
      🚛
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

/**
 * Página de tracking en vivo con mapa
 * Muestra la posición del vehículo en tiempo real sobre el mapa de la ruta
 */
function PackageMapPage() {
  const { packageId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [mapData, setMapData] = useState(null);

  useEffect(() => {
    const fetchMapData = async () => {
      setLoading(true);
      try {
        const res = await mockApi.getMapData(packageId);
        setMapData(res.data);
      } catch (error) {
        console.error('Error cargando datos del mapa:', error);
      } finally {
        setLoading(false);
      }
    };

    if (packageId) {
      fetchMapData();
    }
  }, [packageId]);

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-surface-100">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!mapData) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h2 className="text-xl font-semibold text-surface-800 mb-2">
          No se encontró el paquete
        </h2>
        <Button onClick={() => navigate('/tracking')}>Volver a Tracking</Button>
      </div>
    );
  }

  const { package: pkg, route, checkpoints, tracking_logs } = mapData;
  const latestPosition = tracking_logs.length > 0 ? tracking_logs[0] : null;
  const latestStatus = latestPosition?.status || 'Desconocido';

  // Calcular centro del mapa
  const centerLat = checkpoints.length > 0
    ? checkpoints.reduce((sum, cp) => sum + cp.lat, 0) / checkpoints.length
    : -16.5;
  const centerLng = checkpoints.length > 0
    ? checkpoints.reduce((sum, cp) => sum + cp.lng, 0) / checkpoints.length
    : -68.15;

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-surface-800">
              Tracking en Vivo: {pkg.tracking_code}
            </h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-surface-500">
              <span>📦 {pkg.origen} → {pkg.destino}</span>
              {route && (
                <>
                  <span>🗺️ {route.origin} → {route.destination}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                    🟢 En Ruta
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate('/tracking')}>
              ← Volver
            </Button>
            <Button variant="primary" onClick={() => window.print()}>
              🖨️ Imprimir
            </Button>
          </div>
        </div>
      </div>

      {/* Mapa con tracking en vivo */}
      <div className="flex-1 bg-white rounded-lg shadow-lg overflow-hidden relative">
        <BaseMap
          center={[centerLat, centerLng]}
          zoom={9}
          className="h-full w-full"
        >
          {/* Componente de tracking en vivo */}
          <LiveTracker
            packageId={packageId}
            routeId={route?.id}
          />

          {/* Ruta y checkpoints */}
          {checkpoints.length > 0 && (
            <>
              <RoutePath checkpoints={checkpoints} />
              {checkpoints.map((cp) => (
                <CheckpointMarker key={cp.id} checkpoint={cp} />
              ))}
            </>
          )}

          {/* Marcador de última posición conocida (si no hay live tracker aún) */}
          {latestPosition && (
            <Marker
              position={[latestPosition.lat, latestPosition.lng]}
              icon={vehicleIcon}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-semibold">Última Posición Conocida</h3>
                  <p className="text-sm text-surface-500">
                    {new Date(latestPosition.timestamp).toLocaleString()}
                  </p>
                  <p className="text-xs text-surface-400">
                    Estado: {latestStatus}
                  </p>
                </div>
              </Popup>
            </Marker>
          )}
        </BaseMap>
      </div>
    </div>
  );
}

export default PackageMapPage;
