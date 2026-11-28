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
import { useRegisterPageEntity } from '../../ai-chat/pageContext';
import { packageProgress, packageStatusLabel, packageStatusVariant } from '../../../constants/status';
import { timelineFromLogs } from '../packageTimeline';
const PackageLocationMap = lazy(() => import('../components/PackageLocationMap'));

function PackageDetailPage() {
  const { packageId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pkg, setPkg] = useState(null);
  const [logs, setLogs] = useState([]);
  const [problem, setProblem] = useState(null); // null | 'not_found' | 'error'

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setProblem(null);
      try {
        // el paquete por su id (antes se buscaba entre los 50 más recientes y, si no estaba, se mostraba un paquete de EJEMPLO)
        const res = await apiService.getPackage(packageId);
        if (cancelled) return;
        setPkg(res?.data ?? res);
        try {
          const history = await apiService.get(`/tracking/logs/${packageId}`);
          if (!cancelled) setLogs(history?.data ?? []);
        } catch {
          if (!cancelled) setLogs([]); // sin historial se muestra solo el registro del paquete
        }
      } catch (err) {
        if (cancelled) return;
        setPkg(null);
        setProblem(err?.status === 404 ? 'not_found' : 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [packageId]);

  useRegisterPageEntity(pkg?.tracking_code ? { type: 'package', ref: pkg.tracking_code } : null);

  const timeline = useMemo(() => timelineFromLogs(logs, pkg), [logs, pkg]);

  if (loading) return <PageSkeleton stats={4} layout="map" />;

  if (!pkg) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <h2 className="font-display text-3xl font-semibold tracking-[-0.04em] text-surface-950">{problem === 'error' ? 'No pudimos cargar el paquete' : 'No encontramos el paquete'}</h2>
        <p className="max-w-md text-sm text-surface-600">
          {problem === 'error'
            ? 'Hubo un problema al consultar el servidor. Intenta de nuevo en un momento.'
            : 'No existe o no tienes permiso para verlo. Si acabas de crearlo, búscalo por su código en la vista «Todos» de Paquetes.'}
        </p>
        <Button onClick={() => navigate('/logistics/packages')}>Volver a paquetes</Button>
      </div>
    );
  }

  const status = { label: packageStatusLabel(pkg.status), variant: packageStatusVariant(pkg.status) };
  const progress = packageProgress(pkg.status);
  const position = [...logs].reverse().find((l) => Number.isFinite(l.lat) && Number.isFinite(l.lng) && !(l.lat === 0 && l.lng === 0));

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
        <InfoCard title="Especificaciones" icon={Package}><div className="grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-surface-500">Peso</p><p className="mt-1 font-semibold text-surface-900">{pkg.peso != null ? `${pkg.peso} kg` : '—'}</p></div><div><p className="text-xs text-surface-500">Contenido</p><p className="mt-1 font-semibold text-surface-900">{pkg.description || 'Sin descripción'}</p></div></div></InfoCard>
        <InfoCard title="Entrega" icon={Clock3}><div className="space-y-3"><div><p className="text-xs text-surface-500">Fecha estimada</p><p className="mt-1 text-sm font-semibold text-surface-900">{pkg.estimated_delivery || 'No disponible'}</p></div>{progress != null && <div><div className="mb-1 flex items-center justify-between"><p className="text-xs text-surface-500">Avance</p><p className="text-xs font-semibold text-surface-900">{progress}%</p></div><ProgressBar value={progress} size="md" variant="primary" /></div>}<div><Badge variant={status.variant} dot>{status.label}</Badge></div></div></InfoCard>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
        <div className="rounded-[1.6rem] border border-white/70 bg-white/88 p-4 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] backdrop-blur-xl sm:rounded-[1.8rem] sm:p-5">
          <div className="mb-4 flex flex-col gap-3 border-b border-surface-100 pb-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="mt-2 font-display text-xl font-semibold tracking-[-0.04em] text-surface-950 sm:text-2xl">Ubicación actual del envío</h2></div><div className="flex flex-wrap gap-2"><Badge variant="info" dot>{pkg.origen} {' -> '} {pkg.destino}</Badge><Badge variant={status.variant} dot>{status.label}</Badge></div></div>
          <div className="h-[24rem] overflow-hidden rounded-[1.4rem] border border-surface-100 sm:h-[28rem] sm:rounded-[1.5rem]">
            <Suspense fallback={<MapCanvasFallback />}>
              <PackageLocationMap position={position ? [position.lat, position.lng] : null} title={pkg.tracking_code} subtitle="Ubicación actual" />
            </Suspense>
          </div>
        </div>

        <div className="rounded-[1.6rem] border border-white/70 bg-white/88 p-4 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] backdrop-blur-xl sm:rounded-[1.8rem] sm:p-5">
          <div className="mb-4 flex items-center gap-3 border-b border-surface-100 pb-4"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-100 text-primary-700"><Route size={18} strokeWidth={2.2} /></div><div><h3 className="font-display text-xl font-semibold tracking-[-0.04em] text-surface-950 sm:text-2xl">Secuencia de entrega</h3></div></div>
          <StatusTimeline steps={timeline} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-3">
        <InfoCard title="Ruta" icon={MapPinned}><div className="space-y-2 text-sm"><p className="font-semibold text-surface-900">{pkg.origen} {' -> '} {pkg.destino}</p><p className="text-surface-500">{pkg.transport_routes?.departure_time ? 'Viaje asignado: sale el ' + new Date(pkg.transport_routes.departure_time).toLocaleString('es-BO', { timeZone: 'America/La_Paz', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) + '.' : 'Todavía sin viaje asignado.'}</p></div></InfoCard>
        <InfoCard title="Estado actual" icon={Radar}><div className="space-y-2 text-sm"><div><Badge variant={status.variant} dot>{status.label}</Badge></div><p className="text-surface-500">La lectura refleja el último estado operativo disponible.</p></div></InfoCard>
        <InfoCard title="Observación" icon={Package}><div className="space-y-2 text-sm"><p className="font-semibold text-surface-900">{pkg.description || 'Sin descripción adicional'}</p><p className="text-surface-500">Contenido declarado por el equipo de despacho.</p></div></InfoCard>
      </section>
    </div>
  );
}

export default PackageDetailPage;
