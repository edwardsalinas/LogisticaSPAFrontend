import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Clock3,
  FileDown,
  MapPinned,
  MoveLeft,
  Package,
  Radar,
  Route,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import Badge from '../../../components/atoms/Badge';
import Button from '../../../components/atoms/Button';
import PageHeader from '../../../components/organisms/PageHeader';
import ProgressBar from '../../../components/atoms/ProgressBar';
import InfoCard from '../../../components/molecules/InfoCard';
import MapCanvasFallback from '../../../components/molecules/MapCanvasFallback';
import StatusTimeline from '../../../components/molecules/StatusTimeline';
import PageSkeleton from '../../../components/organisms/PageSkeleton';
import apiService from '../../../services/apiService';
const PackageLocationMap = lazy(() => import('../components/PackageLocationMap'));

function PackageDetailPage() {
  const { packageId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pkg, setPkg] = useState(null);

  const MOCK_PACKAGE = {
    id: packageId,
    tracking_code: 'SPA-7749202394',
    origen: 'La Paz',
    destino: 'Oruro',
    status: 'en_transito',
    peso: 45.5,
    description: 'Equipos electrónicos',
    priority: 'Express',
    sender: { name: 'ElectroBolivia S.R.L.', address: 'Av. 16 de Julio 1234, La Paz', contact: '+591 2 2201234' },
    receiver: { name: 'Comercializadora El Alto', address: 'C. Comercio 567, El Alto', contact: '+591 2 2805678' },
    dimensions: { length: 60, width: 40, height: 40 },
    content_type: 'Equipos electrónicos',
    current_location: { lat: -16.58, lng: -68.25 },
    estimated_delivery: '2026-03-20 16:00',
    progress: 65,
  };

  useEffect(() => {
    const fetchPackageData = async () => {
      setLoading(true);
      try {
        const pkgRes = await apiService.getPackages();
        const packages = pkgRes.data || [];
        const foundPkg = packages.find((p) => p.id === packageId);
        setPkg(foundPkg || MOCK_PACKAGE);
      } catch (err) {
        console.error('Error cargando paquete:', err);
        setPkg(MOCK_PACKAGE);
      } finally {
        setLoading(false);
      }
    };

    fetchPackageData();
  }, [packageId]);

  const timeline = useMemo(() => ([
    { label: 'Recolectado', date: '19 Mar, 08:30', location: 'La Paz - Almacen central', completed: true, active: false },
    { label: 'Procesado', date: '19 Mar, 10:15', location: 'Centro de distribución', completed: true, active: false },
    { label: 'En transito', date: '19 Mar, 11:00', location: 'Ruta La Paz - Oruro', completed: false, active: true },
    { label: 'Llegada a destino', date: '-', location: 'Oruro - terminal', completed: false, active: false },
    { label: 'Entregado', date: '-', location: '-', completed: false, active: false },
  ]), []);

  if (loading) return <PageSkeleton stats={4} layout="map" />;

  if (!pkg) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <h2 className="font-display text-3xl font-semibold tracking-[-0.04em] text-surface-950">No encontramos el paquete</h2>
        <p className="max-w-md text-sm text-surface-500">La ficha del envío no está disponible. Podemos volver al listado de paquetes.</p>
        <Button onClick={() => navigate('/logistics/packages')}>Volver a paquetes</Button>
      </div>
    );
  }

  const statusConfig = {
    pending: { label: 'Pendiente', variant: 'warning' },
    in_transit: { label: 'En transito', variant: 'info' },
    delivered: { label: 'Entregado', variant: 'success' },
    delayed: { label: 'Retrasado', variant: 'danger' },
  };

  const status = statusConfig[pkg.status] || { label: pkg.status, variant: 'neutral' };
  const priorityVariant = pkg.priority === 'Express' ? 'danger' : 'info';

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title={pkg.tracking_code}
        titleClassName="break-words"
        titleAdornment={<Badge variant={status.variant} dot>{status.label}</Badge>}
        description="Ficha completa del paquete con progreso, actores, ubicación y cronograma de entrega."
        actions={(
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="secondary" onClick={() => navigate('/logistics/packages')}><MoveLeft size={16} strokeWidth={2.2} />Volver</Button>
            <Button onClick={() => window.print()}><FileDown size={16} strokeWidth={2.2} />Descargar PDF</Button>
          </div>
        )}
      />

      <section className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-4">
        <InfoCard title="Remitente" icon={UserRound}>
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-surface-900">
              {pkg.sender?.full_name || pkg.sender_name || 'Invitado'}
            </p>
            {pkg.sender?.email && <p className="text-surface-500 text-xs">{pkg.sender.email}</p>}
            <p className="text-surface-600">
              {pkg.sender_phone || 'Sin teléfono registrado'}
            </p>
            {pkg.sender_id && <Badge variant="info" className="mt-1">Usuario Registrado</Badge>}
          </div>
        </InfoCard>

        <InfoCard title="Destinatario" icon={ShieldCheck}>
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-surface-900">
              {pkg.recipient_name || 'No especificado'}
            </p>
            <p className="text-surface-600">
              {pkg.recipient_phone || 'Sin teléfono'}
            </p>
            <p className="text-surface-500 italic">
              {pkg.recipient_email || 'Sin email'}
            </p>
          </div>
        </InfoCard>
        <InfoCard title="Especificaciones" icon={Package}><div className="grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs uppercase tracking-[0.16em] text-surface-500">Peso</p><p className="mt-1 font-semibold text-surface-900">{pkg.peso || 0} kg</p></div><div><p className="text-xs uppercase tracking-[0.16em] text-surface-500">Dimensiones</p><p className="mt-1 font-semibold text-surface-900">{pkg.dimensions?.length || 60}x{pkg.dimensions?.width || 40}x{pkg.dimensions?.height || 40} cm</p></div><div><p className="text-xs uppercase tracking-[0.16em] text-surface-500">Contenido</p><p className="mt-1 font-semibold text-surface-900">{pkg.content_type || pkg.description || 'General'}</p></div><div><p className="text-xs uppercase tracking-[0.16em] text-surface-500">Prioridad</p><div className="mt-1"><Badge variant={priorityVariant}>{pkg.priority || 'Estandar'}</Badge></div></div></div></InfoCard>
        <InfoCard title="Entrega" icon={Clock3}><div className="space-y-3"><div><p className="text-xs uppercase tracking-[0.16em] text-surface-500">Fecha estimada</p><p className="mt-1 text-sm font-semibold text-surface-900">{pkg.estimated_delivery || 'No disponible'}</p></div><div><div className="mb-1 flex items-center justify-between"><p className="text-xs uppercase tracking-[0.16em] text-surface-500">Progreso</p><p className="text-xs font-semibold text-surface-900">{pkg.progress || 65}%</p></div><ProgressBar value={pkg.progress || 65} size="md" variant="primary" /></div><div><Badge variant={status.variant} dot>{status.label}</Badge></div></div></InfoCard>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
        <div className="rounded-[1.6rem] border border-white/70 bg-white/88 p-4 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] backdrop-blur-xl sm:rounded-[1.8rem] sm:p-5">
          <div className="mb-4 flex flex-col gap-3 border-b border-surface-100 pb-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="mt-2 font-display text-xl font-semibold tracking-[-0.04em] text-surface-950 sm:text-2xl">Ubicación actual del envío</h2></div><div className="flex flex-wrap gap-2"><Badge variant="info" dot>{pkg.origen} {' -> '} {pkg.destino}</Badge><Badge variant={status.variant} dot>{status.label}</Badge></div></div>
          <div className="h-[24rem] overflow-hidden rounded-[1.4rem] border border-surface-100 sm:h-[28rem] sm:rounded-[1.5rem]">
            <Suspense fallback={<MapCanvasFallback />}>
              <PackageLocationMap position={pkg.current_location ? [pkg.current_location.lat, pkg.current_location.lng] : null} title={pkg.tracking_code} subtitle="Ubicación actual" />
            </Suspense>
          </div>
        </div>

        <div className="rounded-[1.6rem] border border-white/70 bg-white/88 p-4 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] backdrop-blur-xl sm:rounded-[1.8rem] sm:p-5">
          <div className="mb-4 flex items-center gap-3 border-b border-surface-100 pb-4"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-100 text-primary-700"><Route size={18} strokeWidth={2.2} /></div><div><h3 className="font-display text-xl font-semibold tracking-[-0.04em] text-surface-950 sm:text-2xl">Secuencia de entrega</h3></div></div>
          <StatusTimeline steps={timeline} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-3">
        <InfoCard title="Ruta" icon={MapPinned}><div className="space-y-2 text-sm"><p className="font-semibold text-surface-900">{pkg.origen} {' -> '} {pkg.destino}</p><p className="text-surface-500">Movimiento principal configurado para esta entrega.</p></div></InfoCard>
        <InfoCard title="Estado actual" icon={Radar}><div className="space-y-2 text-sm"><div><Badge variant={status.variant} dot>{status.label}</Badge></div><p className="text-surface-500">La lectura refleja el último estado operativo disponible.</p></div></InfoCard>
        <InfoCard title="Observación" icon={Package}><div className="space-y-2 text-sm"><p className="font-semibold text-surface-900">{pkg.description || 'Sin descripción adicional'}</p><p className="text-surface-500">Contenido declarado por el equipo de despacho.</p></div></InfoCard>
      </section>
    </div>
  );
}

export default PackageDetailPage;
