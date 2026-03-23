import { Boxes, MoveRight } from 'lucide-react';
import Avatar from '../../../components/atoms/Avatar';
import Badge from '../../../components/atoms/Badge';
import ProgressBar from '../../../components/atoms/ProgressBar';

import { usePackages } from '../../../hooks/queries/usePackages';

const STATUS_MAP = {
  pending: { label: 'Pendiente', variant: 'warning' },
  in_transit: { label: 'En ruta', variant: 'info' },
  delivered: { label: 'Entregado', variant: 'success' },
  delayed: { label: 'Retraso', variant: 'danger' },
};

export default function PrioritizedShipments() {
  const { data: rawPackages = [], isLoading } = usePackages();

  const packages = (rawPackages.data || rawPackages)
    .slice(0, 5)
    .map(pkg => ({
      id: pkg.id.split('-')[0].toUpperCase(), // Short ID for UI
      destination: `${pkg.origen} -> ${pkg.destino}`,
      operator: { name: 'Unidad Logistica', initials: 'UL' },
      status: pkg.status || 'pending',
      progress: pkg.status === 'delivered' ? 100 : pkg.status === 'in_transit' ? 50 : 10,
      eta: pkg.status === 'delivered' ? 'Entregado' : '---'
    }));

  if (isLoading) return <div className="p-8 text-center">Cargando despachos...</div>;
  return (
    <article className="overflow-hidden rounded-[1.8rem] border border-white/70 bg-white/85 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.32)] backdrop-blur-xl">
      <div className="flex flex-col gap-4 border-b border-surface-100 px-6 py-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-surface-500">Despachos prioritarios</p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em] text-surface-950">Lectura rapida de lo que requiere seguimiento hoy.</h2>
        </div>
        <button className="inline-flex items-center gap-2 text-sm font-semibold text-primary-700 transition-colors hover:text-primary-800">
          Ver operacion completa<MoveRight size={16} strokeWidth={2.2} />
        </button>
      </div>
      <div className="overflow-x-auto px-2 pb-2 sm:px-4 sm:pb-4">
        <table className="w-full border-separate border-spacing-y-3">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-surface-500">Despacho</th>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-surface-500">Destino</th>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-surface-500">Operador</th>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-surface-500">Estado</th>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-surface-500">ETA</th>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-surface-500">Progreso</th>
            </tr>
          </thead>
          <tbody>
            {packages.map((shipment) => {
              const statusConfig = STATUS_MAP[shipment.status] || { label: shipment.status, variant: 'neutral' };
              const progressTone = shipment.progress === 100 ? 'success' : shipment.progress >= 50 ? 'primary' : 'warning';
              
              return (
                <tr key={shipment.id} className="rounded-[1.35rem] bg-surface-50/75 shadow-[0_10px_35px_-30px_rgba(15,23,42,0.4)]">
                  <td className="rounded-l-[1.2rem] px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-100 text-primary-700">
                        <Boxes size={18} strokeWidth={2.1} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-surface-900">{shipment.id}</p>
                        <p className="text-xs text-surface-500">Despacho priorizado</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-surface-700">{shipment.destination}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={shipment.operator.name} size="sm" className="ring-2 ring-white" />
                      <div>
                        <p className="text-sm font-semibold text-surface-800">{shipment.operator.name}</p>
                        <p className="text-xs text-surface-500">Operador asignado</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                  </td>
                  <td className="px-4 py-4 text-sm font-medium text-surface-700">{shipment.eta}</td>
                  <td className="rounded-r-[1.2rem] px-4 py-4">
                    <div className="w-36">
                      <ProgressBar value={shipment.progress} size="sm" variant={progressTone} showLabel />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </article>
  );
}
