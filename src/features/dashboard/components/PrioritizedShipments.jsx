import { Boxes, MoveRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Badge from '../../../components/atoms/Badge';
import ProgressBar from '../../../components/atoms/ProgressBar';

import { usePackages } from '../../../hooks/queries/usePackages';
import { PACKAGE_STATUS, normalizePackageStatus, packageProgress, packageStatusLabel, packageStatusVariant } from '../../../constants/status';
import { formatTripLabel, tripDate } from '../../logistics/packageSearch';

const MAX_ROWS = 5;
const CLOSED = new Set([PACKAGE_STATUS.DELIVERED, PACKAGE_STATUS.CANCELLED, PACKAGE_STATUS.RETURNED]);

/**
 * Por qué un paquete pide atención ahora, y qué tan urgente es (rank menor = antes). Antes el tablero mostraba los 5 paquetes más NUEVOS, sin
 * importar su estado: un siniestro viejo no aparecía y uno entregado ocupaba un lugar. Ahora va primero lo que de verdad requiere seguimiento.
 */
export const attentionOf = (pkg, now = Date.now()) => {
  const status = normalizePackageStatus(pkg.status);
  if (CLOSED.has(status)) return null;
  if (status === PACKAGE_STATUS.INCIDENT) return { rank: 0, reason: 'Siniestro: requiere atención' };
  const departs = tripDate(pkg);
  if (status === PACKAGE_STATUS.ASSIGNED && departs && departs.getTime() < now) return { rank: 1, reason: 'Retrasado: su viaje ya debía haber salido' };
  if (status === PACKAGE_STATUS.PENDING && !pkg.route_id) return { rank: 2, reason: 'Sin viaje: falta asignarlo' };
  if (status === PACKAGE_STATUS.AT_AGENCY) return { rank: 3, reason: 'En agencia' };
  if (status === PACKAGE_STATUS.IN_TRANSIT) return { rank: 4, reason: 'En ruta' };
  if (status === PACKAGE_STATUS.ASSIGNED) return { rank: 5, reason: 'Viaje programado' };
  return { rank: 6, reason: 'Pendiente' };
};

/** Los paquetes que más atención piden: { rows, total } (total = cuántos piden atención en todo, para decir «mostrando N de M»). */
export const prioritize = (packages = [], now = Date.now(), max = MAX_ROWS) => {
  const ranked = packages
    .map((pkg, index) => ({ pkg, index, att: attentionOf(pkg, now) }))
    .filter((x) => x.att)
    .sort((a, b) => a.att.rank - b.att.rank || a.index - b.index); // a igual urgencia, el más reciente primero (la lista ya viene así)
  return { rows: ranked.slice(0, max).map((x) => ({ ...x.pkg, reason: x.att.reason })), total: ranked.length };
};

export default function PrioritizedShipments() {
  const { data: rawPackages = [], isLoading } = usePackages();
  const { rows, total } = prioritize(rawPackages.data || rawPackages);

  if (isLoading) return <div className="p-8 text-center">Cargando despachos...</div>;
  return (
    <article className="overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-surface-100 px-6 py-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-[-0.03em] text-surface-950">Despachos prioritarios</h2>
          <p className="mt-1 text-sm text-surface-600">Lo que más atención pide: siniestros, retrasos y paquetes sin viaje primero.</p>
        </div>
        <Link to="/logistics/packages" className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-primary-700 transition-colors hover:text-primary-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500">
          Ver operación completa<MoveRight size={16} strokeWidth={2.2} aria-hidden="true" />
        </Link>
      </div>
      <div className="overflow-x-auto px-2 pb-2 sm:px-4 sm:pb-4">
        <table className="w-full border-collapse tabular-nums">
          <thead>
            <tr>
              <th scope="col" className="border-b border-surface-200 bg-white px-4 py-3 text-left text-xs font-semibold text-surface-600">Paquete</th>
              <th scope="col" className="border-b border-surface-200 bg-white px-4 py-3 text-left text-xs font-semibold text-surface-600">Ruta</th>
              <th scope="col" className="border-b border-surface-200 bg-white px-4 py-3 text-left text-xs font-semibold text-surface-600">Destinatario</th>
              <th scope="col" className="border-b border-surface-200 bg-white px-4 py-3 text-left text-xs font-semibold text-surface-600">Estado</th>
              <th scope="col" className="border-b border-surface-200 bg-white px-4 py-3 text-left text-xs font-semibold text-surface-600">Viaje</th>
              <th scope="col" className="border-b border-surface-200 bg-white px-4 py-3 text-left text-xs font-semibold text-surface-600">Avance</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan="6" className="px-4 py-10 text-center text-sm text-surface-600">No hay paquetes que requieran atención ahora.</td></tr>
            )}
            {rows.map((pkg) => {
              const progress = packageProgress(pkg.status);
              const tone = progress === 100 ? 'success' : progress >= 50 ? 'primary' : 'warning';
              return (
                <tr key={pkg.id} className="border-b border-surface-100 transition-colors last:border-b-0 hover:bg-surface-50/70">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-100 text-primary-700">
                        <Boxes size={18} strokeWidth={2.1} />
                      </div>
                      <div>
                        {/* el código del paquete (el mismo que en Paquetes y en el seguimiento), con enlace a su ficha */}
                        <Link to={`/logistics/packages/${pkg.id}`} className="inline-flex min-h-11 items-center font-mono text-xs font-bold text-primary-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500">{pkg.tracking_code}</Link>
                        <p className="text-xs text-surface-600">{pkg.reason}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-surface-700">{pkg.origen} → {pkg.destino}</td>
                  <td className="px-4 py-3.5 text-sm text-surface-700">{pkg.recipient_name || '—'}</td>
                  <td className="px-4 py-3.5"><Badge variant={packageStatusVariant(pkg.status)}>{packageStatusLabel(pkg.status)}</Badge></td>
                  <td className="px-4 py-3.5 text-sm font-medium text-surface-700">{formatTripLabel(pkg)}</td>
                  <td className="px-4 py-3.5">
                    {progress == null ? <span className="text-xs text-surface-600">—</span> : <div className="w-36"><ProgressBar value={progress} size="sm" variant={tone} showLabel /></div>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {total > rows.length && (
          <p className="px-4 pb-3 pt-2 text-xs text-surface-600" role="status">
            Mostrando {rows.length} de {total} que requieren atención. <Link to="/logistics/packages" className="font-semibold text-primary-700 hover:underline">Ver todos</Link>
          </p>
        )}
      </div>
    </article>
  );
}
