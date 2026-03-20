import { Clock3, MapPinned, Package, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import Badge from '../../../components/atoms/Badge';
import Skeleton from '../../../components/atoms/Skeleton';
import EmptyState from '../../../components/molecules/EmptyState';
import api from '../../../services/api';

const statusSteps = [
  { key: 'pending', label: 'Recibido en almacen', description: 'Procesado y listo para salida' },
  { key: 'assigned', label: 'Asignado a ruta', description: 'Paquete asignado a una ruta de transporte' },
  { key: 'in_transit', label: 'En transito', description: 'Desplazamiento hacia el siguiente nodo logistico' },
  { key: 'delivered', label: 'Entregado', description: 'Confirmacion de entrega realizada' },
];

const statusMeta = {
  pending: { label: 'Pendiente', variant: 'warning' },
  assigned: { label: 'Asignado', variant: 'info' },
  in_transit: { label: 'En transito', variant: 'info' },
  delivered: { label: 'Entregado', variant: 'success' },
};

function PackageDetail({ pkg }) {
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get(`/tracking/logs/${pkg.id}`);
        setLogs(res.data || []);
      } catch (err) {
        console.error('Error cargando historial:', err);
        setLogs([]);
      } finally {
        setLoadingLogs(false);
      }
    };
    fetchLogs();
  }, [pkg.id]);

  const currentStepIndex = statusSteps.findIndex((s) => s.key === pkg.status);
  const currentStatus = statusMeta[pkg.status] || { label: pkg.status, variant: 'neutral' };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[1.2rem] border border-surface-100 bg-surface-50 p-4"><p className="text-[0.62rem] uppercase tracking-[0.18em] text-surface-500">Codigo</p><p className="mt-2 text-sm font-semibold text-surface-900">{pkg.tracking_code}</p></div>
        <div className="rounded-[1.2rem] border border-surface-100 bg-surface-50 p-4"><p className="text-[0.62rem] uppercase tracking-[0.18em] text-surface-500">Estado</p><div className="mt-2"><Badge variant={currentStatus.variant} dot>{currentStatus.label}</Badge></div></div>
        <div className="rounded-[1.2rem] border border-surface-100 bg-surface-50 p-4"><p className="text-[0.62rem] uppercase tracking-[0.18em] text-surface-500">Origen</p><p className="mt-2 text-sm font-semibold text-surface-900">{pkg.origen}</p></div>
        <div className="rounded-[1.2rem] border border-surface-100 bg-surface-50 p-4"><p className="text-[0.62rem] uppercase tracking-[0.18em] text-surface-500">Destino</p><p className="mt-2 text-sm font-semibold text-surface-900">{pkg.destino}</p></div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="rounded-[1.4rem] border border-surface-100 bg-white p-5 shadow-[0_18px_40px_-36px_rgba(15,23,42,0.2)]">
          <div className="mb-5 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-100 text-primary-700"><Package size={18} strokeWidth={2.2} /></div><div><p className="text-[0.64rem] uppercase tracking-[0.18em] text-surface-500">Ficha del paquete</p><p className="text-sm text-surface-600">Datos base y descripcion operativa.</p></div></div>
          <div className="grid gap-4 md:grid-cols-2">
            <div><p className="text-[0.62rem] uppercase tracking-[0.16em] text-surface-500">Peso</p><p className="mt-2 text-sm font-semibold text-surface-900">{pkg.peso} kg</p></div>
            <div><p className="text-[0.62rem] uppercase tracking-[0.16em] text-surface-500">Descripcion</p><p className="mt-2 text-sm font-semibold text-surface-900">{pkg.description || 'Sin descripcion'}</p></div>
          </div>
        </div>

        <div className="rounded-[1.4rem] border border-surface-100 bg-white p-5 shadow-[0_18px_40px_-36px_rgba(15,23,42,0.2)]">
          <div className="mb-5 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><ShieldCheck size={18} strokeWidth={2.2} /></div><div><p className="text-[0.64rem] uppercase tracking-[0.18em] text-surface-500">Estado del envio</p><p className="text-sm text-surface-600">Secuencia operacional actual.</p></div></div>
          <div className="space-y-4">
            {statusSteps.map((step, idx) => {
              const isCompleted = idx <= currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              return (
                <div key={step.key} className="flex gap-3">
                  <div className="flex flex-col items-center"><div className={`mt-1 h-3 w-3 rounded-full ${isCompleted ? 'bg-primary-500' : 'bg-surface-300'} ${isCurrent ? 'ring-4 ring-primary-100' : ''}`} />{idx < statusSteps.length - 1 && <div className={`h-10 w-0.5 ${isCompleted ? 'bg-primary-300' : 'bg-surface-200'}`} />}</div>
                  <div className="pb-2"><p className={`text-sm font-semibold ${isCompleted ? 'text-surface-900' : 'text-surface-400'}`}>{step.label}</p><p className="mt-1 text-xs text-surface-500">{step.description}</p></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-[1.4rem] border border-surface-100 bg-white p-5 shadow-[0_18px_40px_-36px_rgba(15,23,42,0.2)]">
        <div className="mb-5 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700"><MapPinned size={18} strokeWidth={2.2} /></div><div><p className="text-[0.64rem] uppercase tracking-[0.18em] text-surface-500">Historial de trazabilidad</p><p className="text-sm text-surface-600">Eventos y coordenadas registrados hasta ahora.</p></div></div>
        {loadingLogs ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="rounded-[1.2rem] border border-surface-100 bg-surface-50 p-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-3 h-3 w-48" />
                <Skeleton className="mt-4 h-3 w-40" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            eyebrow="Sin eventos"
            title="Aun no hay trazabilidad registrada"
            description="Cuando el paquete genere movimientos o checkpoints, aqui mostraremos el historial cronologico."
            className="min-h-[14rem] border-surface-100 bg-surface-50/60"
          />
        ) : (
          <div className="space-y-3">
            {logs.map((log, idx) => (
              <div key={idx} className="rounded-[1.2rem] border border-surface-100 bg-surface-50 p-4 transition-colors hover:bg-white">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-surface-900">{log.status}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-surface-500"><MapPinned size={13} strokeWidth={2.2} /> {log.lat}, {log.lng}</p>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs text-surface-400"><Clock3 size={13} strokeWidth={2.2} /> {new Date(log.timestamp).toLocaleString('es-BO')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default PackageDetail;
