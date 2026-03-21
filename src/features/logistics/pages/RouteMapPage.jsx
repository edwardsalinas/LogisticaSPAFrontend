import { Suspense, lazy, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapPinned, MoveLeft, Route, Ruler, TimerReset } from 'lucide-react';
import Button from '../../../components/atoms/Button';
import StatCard from '../../../components/molecules/StatCard';
import MapCanvasFallback from '../../../components/molecules/MapCanvasFallback';
import Modal from '../../../components/molecules/Modal';
import { heroImages } from '../../../constants/heroImages';
import { mockRoutes } from '../../../services/api.mock';
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

  const isActive = route.status === 'active';

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="relative overflow-hidden rounded-[1.7rem] border border-white/70 bg-[linear-gradient(135deg,#06111f_0%,#0b1d34_35%,#f8fbff_100%)] p-6 shadow-[0_28px_80px_-48px_rgba(2,36,72,0.7)] sm:rounded-[2rem] sm:p-8">
        <div className="absolute inset-0">
          <img src={heroImages.routeMap.url} alt={heroImages.routeMap.alt} className="h-full w-full object-cover object-center" />
          <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(6,17,31,0.94)_0%,rgba(11,29,52,0.84)_38%,rgba(11,29,52,0.34)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.18),transparent_34%)]" />
        </div>
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.95fr)] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-sky-100/85 backdrop-blur"><Route size={14} strokeWidth={2.2} />Mapa de ruta</div>
            <h1 className="mt-5 max-w-3xl font-display text-[clamp(2rem,4.5vw,3.8rem)] font-semibold tracking-[-0.06em] text-white">{route.origin} {' -> '} {route.destination}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">Vista operativa para checkpoints, distancia estimada y lectura espacial completa de la ruta.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Button variant="secondary" className="border-white/14 bg-white/8 text-white hover:bg-white/14" onClick={() => navigate('/logistics/routes')}><MoveLeft size={16} strokeWidth={2.2} />Volver</Button>
            <Button size="lg" onClick={() => setShowCheckpointForm(true)}>+ Agregar checkpoint</Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-3">
        <StatCard label="Duracion estimada" value={`${route.estimated_duration_minutes || 'N/A'} min`} icon={TimerReset} caption="Tiempo estimado total de recorrido." tone="blue" />
        <StatCard label="Distancia total" value={`${route.total_distance_km || 'N/A'} km`} icon={Ruler} caption="Longitud acumulada de la ruta." tone="emerald" />
        <StatCard label="Estado de ruta" value={isActive ? 'Activa' : route.status} icon={MapPinned} caption="Condicion actual del circuito logistico." tone={isActive ? 'amber' : 'violet'} />
      </section>

      <section className="rounded-[1.6rem] border border-white/70 bg-white/88 p-4 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] backdrop-blur-xl sm:rounded-[1.8rem] sm:p-5">
        <div className="mb-4 flex flex-col gap-2 border-b border-surface-100 px-1 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[0.64rem] uppercase tracking-[0.24em] text-surface-500">Vista geoespacial</p>
            <h2 className="mt-2 font-display text-xl font-semibold tracking-[-0.04em] text-surface-950 sm:text-2xl">Mapa operativo</h2>
          </div>
          <p className="max-w-xl text-sm text-surface-500">Selecciona un checkpoint dentro del mapa para ver detalles, secuencia y datos de radio.</p>
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
        title={selectedCheckpoint ? 'Editar checkpoint' : 'Nuevo checkpoint'}
      >
        <CheckpointForm
          routeId={routeId}
          checkpoint={selectedCheckpoint}
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
