import { useState, useEffect } from 'react';
import BaseMap from '../../../components/molecules/BaseMap';
import CheckpointMarker from '../../../components/molecules/CheckpointMarker';
import VehicleMarker from '../../../components/molecules/VehicleMarker';
import RoutePath from '../../../components/molecules/RoutePath';
import FitBounds from '../../../components/molecules/FitBounds';
import Spinner from '../../../components/atoms/Spinner';
import Button from '../../../components/atoms/Button';
import { mockApi } from '../../../services/api.mock';

/**
 * Mapa de ruta con checkpoints
 * Muestra la ruta completa, todos los checkpoints y la posición actual del vehículo
 */
function RouteMap({ routeId, initialPosition, showControls = false }) {
  const [checkpoints, setCheckpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const fetchCheckpoints = async () => {
      setLoading(true);
      try {
        const res = await mockApi.getCheckpointsByRoute(routeId);
        setCheckpoints(res.data || []);
      } catch (error) {
        console.error('Error cargando checkpoints:', error);
        setCheckpoints([]);
      } finally {
        setLoading(false);
      }
    };

    if (routeId) {
      fetchCheckpoints();
    }
  }, [routeId]);

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-surface-100">
        <Spinner size="lg" />
      </div>
    );
  }

  if (checkpoints.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-surface-100">
        <p className="text-surface-500 mb-4">No hay checkpoints registrados para esta ruta</p>
        {showControls && (
          <Button onClick={() => setShowForm(true)}>+ Agregar Primer Checkpoint</Button>
        )}
      </div>
    );
  }

  // Calcular el centro del mapa basado en los checkpoints
  const centerLat = checkpoints.reduce((sum, cp) => sum + cp.lat, 0) / checkpoints.length;
  const centerLng = checkpoints.reduce((sum, cp) => sum + cp.lng, 0) / checkpoints.length;

  return (
    <div className="relative h-full w-full">
      <BaseMap
        center={[centerLat, centerLng]}
        zoom={9}
        className="h-full w-full rounded-lg shadow-lg"
      >
        {/* Ajustar viewport a todos los checkpoints */}
        <FitBounds checkpoints={checkpoints} />

        {/* Dibujar la ruta entre checkpoints */}
        <RoutePath checkpoints={checkpoints} />

        {/* Renderizar todos los checkpoints */}
        {checkpoints.map((checkpoint) => (
          <CheckpointMarker
            key={checkpoint.id}
            checkpoint={checkpoint}
            onClick={setSelectedCheckpoint}
          />
        ))}

        {/* Mostrar posición actual del vehículo si está disponible */}
        {initialPosition && (
          <VehicleMarker
            position={[initialPosition.lat, initialPosition.lng]}
            title="Vehículo en Tránsito"
            subtitle={`Última actualización: ${new Date().toLocaleTimeString()}`}
          />
        )}
      </BaseMap>

      {/* Panel de información del checkpoint seleccionado */}
      {selectedCheckpoint && (
        <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white rounded-lg shadow-lg p-4 z-[1000]">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-surface-800">{selectedCheckpoint.name}</h3>
            <button
              onClick={() => setSelectedCheckpoint(null)}
              className="text-surface-400 hover:text-surface-600"
            >
              ✕
            </button>
          </div>
          <div className="space-y-1 text-sm">
            <p className="text-surface-600">
              📍 {selectedCheckpoint.lat.toFixed(6)}, {selectedCheckpoint.lng.toFixed(6)}
            </p>
            <p className="text-surface-600">🔵 Radio: {selectedCheckpoint.radius_meters}m</p>
            <p className="text-surface-600">🔢 Secuencia: {selectedCheckpoint.sequence_order}</p>
          </div>
          {showControls && (
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="secondary">Editar</Button>
              <Button size="sm" variant="danger">Eliminar</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RouteMap;
