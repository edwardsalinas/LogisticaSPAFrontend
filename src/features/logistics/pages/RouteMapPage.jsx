import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '../../../components/atoms/Button';
import Modal from '../../../components/molecules/Modal';
import RouteMap from '../components/RouteMap';
import CheckpointForm from '../components/CheckpointForm';
import { mockRoutes } from '../../../services/api.mock';

/**
 * Página de mapa de ruta
 * Muestra el mapa interactivo con checkpoints para una ruta específica
 */
function RouteMapPage() {
  const { routeId } = useParams();
  const navigate = useNavigate();
  const [showCheckpointForm, setShowCheckpointForm] = useState(false);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState(null);

  // Buscar la ruta actual (en producción esto vendría de la API)
  const route = mockRoutes.find((r) => r.id === routeId);

  if (!route) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h2 className="text-xl font-semibold text-surface-800 mb-2">Ruta no encontrada</h2>
        <Button onClick={() => navigate('/logistics/routes')}>Volver a Rutas</Button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      {/* Header con información de la ruta */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-surface-800">
              Mapa de Ruta: {route.origin} → {route.destination}
            </h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-surface-500">
              <span>⏱️ {route.estimated_duration_minutes || 'N/A'} min estimados</span>
              <span>📏 {route.total_distance_km || 'N/A'} km</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                route.status === 'active' 
                  ? 'bg-success/10 text-success' 
                  : 'bg-warning/10 text-warning'
              }`}>
                {route.status === 'active' ? 'Activa' : route.status}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate('/logistics/routes')}>
              ← Volver
            </Button>
            <Button onClick={() => setShowCheckpointForm(true)}>
              + Agregar Checkpoint
            </Button>
          </div>
        </div>
      </div>

      {/* Mapa */}
      <div className="flex-1 bg-white rounded-lg shadow-lg overflow-hidden">
        <RouteMap 
          routeId={routeId} 
          showControls={true}
          initialPosition={null}
        />
      </div>

      {/* Modal para crear/editar checkpoint */}
      <Modal
        isOpen={showCheckpointForm}
        onClose={() => {
          setShowCheckpointForm(false);
          setSelectedCheckpoint(null);
        }}
        title={selectedCheckpoint ? 'Editar Checkpoint' : 'Nuevo Checkpoint'}
      >
        <CheckpointForm
          routeId={routeId}
          checkpoint={selectedCheckpoint}
          onSuccess={() => {
            setShowCheckpointForm(false);
            setSelectedCheckpoint(null);
          }}
          onCancel={() => {
            setShowCheckpointForm(false);
            setSelectedCheckpoint(null);
          }}
        />
      </Modal>
    </div>
  );
}

export default RouteMapPage;
