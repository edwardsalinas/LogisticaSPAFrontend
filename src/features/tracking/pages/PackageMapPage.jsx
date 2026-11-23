import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Activity, MapPinned, MoveLeft, PackageCheck, Printer, Route } from 'lucide-react';
import Badge from '../../../components/atoms/Badge';
import Button from '../../../components/atoms/Button';
import PageHeader from '../../../components/organisms/PageHeader';
import StatCard from '../../../components/molecules/StatCard';
import MapCanvasFallback from '../../../components/molecules/MapCanvasFallback';
import PageSkeleton from '../../../components/organisms/PageSkeleton';
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

  // Los hooks van antes de los return anticipados: si no, al terminar de cargar React ve más hooks que antes y la pantalla se rompe
  const mapRoute = mapData?.route;
  const routeStatus = useMemo(() => {
    if (!mapRoute) return { label: 'Sin ruta', variant: 'neutral' };
    return mapRoute.status === 'active' ? { label: 'En ruta', variant: 'success' } : { label: mapRoute.status, variant: 'info' };
  }, [mapRoute]);

  if (loading) return <PageSkeleton stats={4} layout="map" />;

  if (!mapData) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <h2 className="font-display text-3xl font-semibold tracking-[-0.04em] text-surface-950">No encontramos el paquete</h2>
        <p className="max-w-md text-sm text-surface-500">No fue posible cargar la vista de mapa para este envío. Podemos volver al módulo de tracking.</p>
        <Button onClick={() => navigate('/tracking')}>Volver a tracking</Button>
      </div>
    );
  }

  const { package: pkg, route, checkpoints, tracking_logs } = mapData;
  const latestPosition = tracking_logs.length > 0 ? tracking_logs[0] : null;
  const centerLat = checkpoints.length > 0 ? checkpoints.reduce((sum, cp) => sum + cp.lat, 0) / checkpoints.length : -16.5;
  const centerLng = checkpoints.length > 0 ? checkpoints.reduce((sum, cp) => sum + cp.lng, 0) / checkpoints.length : -68.15;

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title={pkg.tracking_code}
        titleClassName="break-all sm:break-normal"
        description="Seguimiento espacial del envío con puntos de control, última posición conocida y lectura activa sobre el mapa."
        actions={(
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="secondary" onClick={() => navigate('/tracking')}><MoveLeft size={16} strokeWidth={2.2} />Volver</Button>
            <Button onClick={() => window.print()}><Printer size={16} strokeWidth={2.2} />Imprimir</Button>
          </div>
        )}
      />

      <section className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-4">
        <StatCard label="Origen" value={pkg.origen} icon={MapPinned} caption="Ciudad de salida del paquete." tone="blue" />
        <StatCard label="Destino" value={pkg.destino} icon={PackageCheck} caption="Destino configurado para la entrega." tone="emerald" />
        <StatCard label="Puntos de control" value={checkpoints.length} icon={Route} caption="Puntos visibles a lo largo de la ruta." tone="amber" />
        <StatCard label="Estado de ruta" value={routeStatus.label} icon={Activity} caption="Condición operativa actual del movimiento." tone="violet" />
      </section>

      <section className="rounded-[1.6rem] border border-white/70 bg-white/88 p-4 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] backdrop-blur-xl sm:rounded-[1.8rem] sm:p-5">
        <div className="mb-4 flex flex-col gap-3 border-b border-surface-100 px-1 pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="mt-2 font-display text-xl font-semibold tracking-[-0.04em] text-surface-950 sm:text-2xl">Ruta completa del paquete</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={routeStatus.variant} dot>{routeStatus.label}</Badge>
            {latestPosition && <Badge variant="info" dot>Última posición disponible</Badge>}
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
