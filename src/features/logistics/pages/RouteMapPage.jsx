import { isRouteActive } from '../../../constants/status';
import { Suspense, lazy, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapPinned, MoveLeft, Route, Ruler, TimerReset } from 'lucide-react';
import Button from '../../../components/atoms/Button';
import PageHeader from '../../../components/organisms/PageHeader';
import StatCard from '../../../components/molecules/StatCard';
import MapCanvasFallback from '../../../components/molecules/MapCanvasFallback';
import Modal from '../../../components/molecules/Modal';
import apiService from '../../../services/apiService';
import CheckpointForm from '../components/CheckpointForm';
const RouteMap = lazy(() => import('../components/RouteMap'));

function RouteMapPage() {
  const { routeId } = useParams();
  const navigate = useNavigate();
  const [showCheckpointForm, setShowCheckpointForm] = useState(false);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState(null);
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRoute = async () => {
    try {
      const res = await apiService.getRoute(routeId);
      setRoute(res.data);
    } catch (err) {
      console.error(err);
      setRoute(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoute();
  }, [routeId]);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <p className="text-surface-500">Cargando datos de la ruta...</p>
      </div>
    );
  }

  if (!route) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <h2 className="font-display text-3xl font-semibold tracking-[-0.04em] text-surface-950">Ruta no encontrada</h2>
        <p className="max-w-md text-sm text-surface-500">No encontramos la ruta solicitada o fue eliminada.</p>
        <Button onClick={() => navigate('/logistics/routes')}>Volver a rutas</Button>
      </div>
    );
  }

  const isActive = isRouteActive(route.status);

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title={`${route.origin} → ${route.destination}`}
        description="Vista operativa para puntos de control, distancia estimada y lectura espacial completa de la ruta."
        actions={(
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="secondary" onClick={() => navigate('/logistics/routes')}><MoveLeft size={16} strokeWidth={2.2} />Volver</Button>
            <Button onClick={() => setShowCheckpointForm(true)}>+ Agregar punto de control</Button>
          </div>
        )}
      />

      <section className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-3">
        <StatCard label="Duración estimada" value={`${route.estimated_duration_minutes || 'N/A'} min`} icon={TimerReset} caption="Tiempo estimado total de recorrido." tone="blue" />
        <StatCard label="Distancia total" value={`${route.total_distance_km || 'N/A'} km`} icon={Ruler} caption="Longitud acumulada de la ruta." tone="emerald" />
        <StatCard label="Estado de ruta" value={isActive ? 'Activa' : route.status} icon={MapPinned} caption="Condición actual del circuito logístico." tone={isActive ? 'amber' : 'violet'} />
      </section>

      <section className="rounded-[1.6rem] border border-white/70 bg-white/88 p-4 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] backdrop-blur-xl sm:rounded-[1.8rem] sm:p-5">
        <div className="mb-4 flex flex-col gap-2 border-b border-surface-100 px-1 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-surface-500">Vista geoespacial</p>
            <h2 className="mt-2 font-display text-xl font-semibold tracking-[-0.04em] text-surface-950 sm:text-2xl">Mapa operativo</h2>
          </div>
          <p className="max-w-xl text-sm text-surface-500">Selecciona un punto de control dentro del mapa para ver detalles, secuencia y datos de radio.</p>
        </div>
        <div className="h-[55vh] min-h-[26rem] overflow-hidden rounded-[1.4rem] border border-surface-100 sm:h-[calc(100vh-24rem)] sm:min-h-[34rem] sm:rounded-[1.6rem]">
          <Suspense fallback={<MapCanvasFallback />}>
            <RouteMap routeId={routeId} showControls initialPosition={null} />
          </Suspense>
        </div>
      </section>

      <Modal
        isOpen={showCheckpointForm}
        onClose={() => {
          setShowCheckpointForm(false);
          setSelectedCheckpoint(null);
        }}
        title={selectedCheckpoint ? 'Editar punto de control' : 'Nuevo punto de control'}
      >
        <CheckpointForm
          routeId={routeId}
          checkpoint={selectedCheckpoint}
          nextOrder={(route.checkpoints?.length ?? 0) + 1}
          onSuccess={() => {
            setShowCheckpointForm(false);
            setSelectedCheckpoint(null);
            fetchRoute();
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
