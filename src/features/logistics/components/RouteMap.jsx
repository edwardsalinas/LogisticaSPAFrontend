import { MapPinned, PenLine, Route, Ruler, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import Badge from '../../../components/atoms/Badge';
import Button from '../../../components/atoms/Button';
import EmptyState from '../../../components/molecules/EmptyState';
import SectionLoader from '../../../components/molecules/SectionLoader';
import BaseMap from '../../../components/molecules/BaseMap';
import CheckpointMarker from '../../../components/molecules/CheckpointMarker';
import FitBounds from '../../../components/molecules/FitBounds';
import RoutePath from '../../../components/molecules/RoutePath';
import VehicleMarker from '../../../components/molecules/VehicleMarker';
import apiService from '../../../services/apiService';

function RouteMap({ routeId, initialPosition, showControls = false }) {
  const [checkpoints, setCheckpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState(null);

  useEffect(() => {
    const fetchCheckpoints = async () => {
      setLoading(true);
      try {
        const res = await apiService.getCheckpointsByRoute(routeId);
        setCheckpoints(res.data || []);
      } catch (error) {
        console.error('Error cargando checkpoints:', error);
        setCheckpoints([]);
      } finally {
        setLoading(false);
      }
    };

    if (routeId) fetchCheckpoints();
  }, [routeId]);

  if (loading) {
    return <SectionLoader eyebrow="Cargando mapa" title="Preparando checkpoints y ruta" description="Estamos organizando la geometria operativa y los puntos de control." className="min-h-[28rem] rounded-none border-none shadow-none" />;
  }

  if (checkpoints.length === 0) {
    return (
      <EmptyState
        eyebrow="Sin checkpoints"
        title="Todavia no hay puntos de control"
        description="Agrega el primer checkpoint para dibujar la ruta y habilitar el seguimiento geoespacial."
        action={showControls ? <Button>+ Agregar primer checkpoint</Button> : null}
        className="min-h-[28rem] rounded-none border-none bg-[radial-gradient(circle_at_top,rgba(11,78,162,0.06),transparent_55%)] shadow-none"
      />
    );
  }

  const centerLat = checkpoints.reduce((sum, cp) => sum + cp.lat, 0) / checkpoints.length;
  const centerLng = checkpoints.reduce((sum, cp) => sum + cp.lng, 0) / checkpoints.length;
  const totalRadius = checkpoints.reduce((sum, cp) => sum + cp.radius_meters, 0);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[1.6rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.8),rgba(248,250,252,0.88))]">
      <BaseMap center={[centerLat, centerLng]} zoom={9} className="h-full w-full" scrollWheelZoom ariaLabel="Mapa de ruta con checkpoints y posicion de unidad">
        <FitBounds checkpoints={checkpoints} />
        <RoutePath checkpoints={checkpoints} />
        {checkpoints.map((checkpoint) => (
          <CheckpointMarker key={checkpoint.id} checkpoint={checkpoint} onClick={setSelectedCheckpoint} />
        ))}
        {initialPosition && <VehicleMarker position={[initialPosition.lat, initialPosition.lng]} title="Unidad activa" subtitle={`Actualizado ${new Date().toLocaleTimeString('es-BO')}`} />}
      </BaseMap>

      <div className="pointer-events-none absolute left-4 top-4 z-[1000] w-[min(92vw,320px)]">
        <div className="pointer-events-auto rounded-[1.5rem] border border-white/70 bg-white/92 p-4 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.3)] backdrop-blur-xl motion-fade-in">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[0.62rem] uppercase tracking-[0.2em] text-surface-500">Lectura del mapa</p>
              <h3 className="mt-1 font-display text-xl font-semibold tracking-[-0.04em] text-surface-950">Ruta y checkpoints</h3>
            </div>
            <Badge variant="info" dot>{checkpoints.length} puntos</Badge>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-surface-100 bg-surface-50 p-3">
              <p className="text-[0.62rem] uppercase tracking-[0.16em] text-surface-500">Cobertura</p>
              <p className="mt-1 text-sm font-semibold text-surface-900">{totalRadius} m</p>
            </div>
            <div className="rounded-2xl border border-surface-100 bg-surface-50 p-3">
              <p className="text-[0.62rem] uppercase tracking-[0.16em] text-surface-500">Unidad</p>
              <p className="mt-1 text-sm font-semibold text-surface-900">{initialPosition ? 'Visible' : 'No visible'}</p>
            </div>
          </div>
        </div>
      </div>

      {selectedCheckpoint && (
        <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-[1000] md:left-auto md:w-[360px]">
          <div className="pointer-events-auto rounded-[1.5rem] border border-white/70 bg-white/94 p-4 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.3)] backdrop-blur-xl motion-fade-up">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[0.62rem] uppercase tracking-[0.18em] text-surface-500">Checkpoint seleccionado</p>
                <h3 className="mt-1 text-sm font-semibold text-surface-950">{selectedCheckpoint.name}</h3>
              </div>
              <button onClick={() => setSelectedCheckpoint(null)} aria-label="Cerrar detalle del checkpoint" className="rounded-xl p-1 text-surface-500 transition-colors hover:bg-surface-100 hover:text-surface-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                <X size={16} strokeWidth={2.2} />
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-surface-100 bg-surface-50 p-3"><p className="text-[0.62rem] uppercase tracking-[0.16em] text-surface-500">Secuencia</p><p className="mt-1 text-sm font-semibold text-surface-900">#{selectedCheckpoint.sequence_order}</p></div>
              <div className="rounded-2xl border border-surface-100 bg-surface-50 p-3"><p className="text-[0.62rem] uppercase tracking-[0.16em] text-surface-500">Radio</p><p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-surface-900"><Ruler size={13} strokeWidth={2.2} /> {selectedCheckpoint.radius_meters} m</p></div>
              <div className="rounded-2xl border border-surface-100 bg-surface-50 p-3 sm:col-span-2"><p className="text-[0.62rem] uppercase tracking-[0.16em] text-surface-500">Ubicacion</p><p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-surface-900"><MapPinned size={13} strokeWidth={2.2} /> {selectedCheckpoint.lat.toFixed(6)}, {selectedCheckpoint.lng.toFixed(6)}</p></div>
            </div>
            {showControls && <div className="mt-4 flex gap-2"><Button size="sm" variant="secondary"><PenLine size={14} strokeWidth={2.2} />Editar</Button><Button size="sm" variant="danger">Eliminar</Button></div>}
          </div>
        </div>
      )}
    </div>
  );
}

export default RouteMap;
