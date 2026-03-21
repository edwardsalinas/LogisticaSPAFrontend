import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Activity, MapPinned, MoveLeft, PackageCheck, Printer, Route } from 'lucide-react';
import Badge from '../../../components/atoms/Badge';
import Button from '../../../components/atoms/Button';
import StatCard from '../../../components/molecules/StatCard';
import MapCanvasFallback from '../../../components/molecules/MapCanvasFallback';
import PageSkeleton from '../../../components/organisms/PageSkeleton';
import { heroImages } from '../../../constants/heroImages';
import apiService from '../../../services/apiService';
const PackageTrackingMap = lazy(() => import('../components/PackageTrackingMap'));

function PackageMapPage() {
  const { packageId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [mapData, setMapData] = useState(null);

  useEffect(() => {
    const fetchMapData = async () => {
      setLoading(true);
      try {
        const res = await apiService.getMapData(packageId);
        setMapData(res.data);
      } catch (error) {
        console.error('Error cargando datos del mapa:', error);
      } finally {
        setLoading(false);
      }
    };

    if (packageId) fetchMapData();
  }, [packageId]);

  if (loading) return <PageSkeleton stats={4} layout="map" />;

  if (!mapData) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <h2 className="font-display text-3xl font-semibold tracking-[-0.04em] text-surface-950">No encontramos el paquete</h2>
        <p className="max-w-md text-sm text-surface-500">No fue posible cargar la vista de mapa para este envio. Podemos volver al modulo de tracking.</p>
        <Button onClick={() => navigate('/tracking')}>Volver a tracking</Button>
      </div>
    );
  }

  const { package: pkg, route, checkpoints, tracking_logs } = mapData;
  const latestPosition = tracking_logs.length > 0 ? tracking_logs[0] : null;
  const centerLat = checkpoints.length > 0 ? checkpoints.reduce((sum, cp) => sum + cp.lat, 0) / checkpoints.length : -16.5;
  const centerLng = checkpoints.length > 0 ? checkpoints.reduce((sum, cp) => sum + cp.lng, 0) / checkpoints.length : -68.15;

  const routeStatus = useMemo(() => {
    if (!route) return { label: 'Sin ruta', variant: 'neutral' };
    return route.status === 'active' ? { label: 'En ruta', variant: 'success' } : { label: route.status, variant: 'info' };
  }, [route]);

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="relative overflow-hidden rounded-[1.7rem] border border-white/70 bg-[linear-gradient(135deg,#06111f_0%,#0b1d34_35%,#f8fbff_100%)] p-6 shadow-[0_28px_80px_-48px_rgba(2,36,72,0.7)] sm:rounded-[2rem] sm:p-8">
        <div className="absolute inset-0">
          <img src={heroImages.packageMap.url} alt={heroImages.packageMap.alt} className="h-full w-full object-cover object-center" />
          <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(6,17,31,0.94)_0%,rgba(11,29,52,0.84)_38%,rgba(11,29,52,0.34)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.18),transparent_34%)]" />
        </div>
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.95fr)] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-sky-100/85 backdrop-blur"><Activity size={14} strokeWidth={2.2} />Tracking en mapa</div>
            <h1 className="mt-5 max-w-3xl font-display text-[clamp(2rem,4.5vw,3.8rem)] font-semibold tracking-[-0.06em] text-white break-all sm:break-normal">{pkg.tracking_code}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">Seguimiento espacial del envio con checkpoint, ultima posicion conocida y lectura activa sobre el mapa.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Button variant="secondary" className="border-white/14 bg-white/8 text-white hover:bg-white/14" onClick={() => navigate('/tracking')}><MoveLeft size={16} strokeWidth={2.2} />Volver</Button>
            <Button size="lg" onClick={() => window.print()}><Printer size={16} strokeWidth={2.2} />Imprimir</Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-4">
        <StatCard label="Origen" value={pkg.origen} icon={MapPinned} caption="Ciudad de salida del paquete." tone="blue" />
        <StatCard label="Destino" value={pkg.destino} icon={PackageCheck} caption="Destino configurado para la entrega." tone="emerald" />
        <StatCard label="Checkpoints" value={checkpoints.length} icon={Route} caption="Puntos visibles a lo largo de la ruta." tone="amber" />
        <StatCard label="Estado de ruta" value={routeStatus.label} icon={Activity} caption="Condicion operativa actual del movimiento." tone="violet" />
      </section>

      <section className="rounded-[1.6rem] border border-white/70 bg-white/88 p-4 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] backdrop-blur-xl sm:rounded-[1.8rem] sm:p-5">
        <div className="mb-4 flex flex-col gap-3 border-b border-surface-100 px-1 pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[0.64rem] uppercase tracking-[0.24em] text-surface-500">Mapa en vivo</p>
            <h2 className="mt-2 font-display text-xl font-semibold tracking-[-0.04em] text-surface-950 sm:text-2xl">Ruta completa del paquete</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={routeStatus.variant} dot>{routeStatus.label}</Badge>
            {latestPosition && <Badge variant="info" dot>Ultima posicion disponible</Badge>}
          </div>
        </div>
        <div className="h-[55vh] min-h-[26rem] overflow-hidden rounded-[1.4rem] border border-surface-100 sm:h-[calc(100vh-24rem)] sm:min-h-[34rem] sm:rounded-[1.6rem]">
          <Suspense fallback={<MapCanvasFallback />}>
            <PackageTrackingMap
              center={[centerLat, centerLng]}
              packageId={packageId}
              routeId={route?.id}
              checkpoints={checkpoints}
              latestPosition={latestPosition}
            />
          </Suspense>
        </div>
      </section>
    </div>
  );
}

export default PackageMapPage;
