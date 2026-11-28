import { Link } from 'react-router-dom';
import { Boxes } from 'lucide-react';
import Badge from '../../../components/atoms/Badge';
import { packageStatusLabel, packageStatusVariant } from '../../../constants/status';
import { formatTripLabel } from '../packageSearch';

const created = (iso) => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('es-BO', { timeZone: 'America/La_Paz', day: '2-digit', month: 'short', year: 'numeric' }) : '—';
};

/**
 * Todos los paquetes en una lista plana: sin depender de la fecha del tablero ni de que el viaje esté desplegado. Es donde se encuentra
 * cualquier paquete por su código, también uno recién creado o uno asignado a un viaje de otro día.
 */
export default function AllPackagesList({ packages, searching = false, truncatedAt = null, onClear = null }) {
  if (packages.length === 0) {
    return (
      <div className="rounded-2xl border border-surface-200 bg-white px-6 py-14 text-center shadow-sm">
        <Boxes size={40} strokeWidth={1.5} className="mx-auto text-surface-400" aria-hidden="true" />
        <p className="mt-3 text-sm font-semibold text-surface-800">{searching ? 'Ningún paquete coincide con la búsqueda' : 'Todavía no hay paquetes'}</p>
        {searching && onClear && <button type="button" onClick={onClear} className="mt-2 min-h-11 text-sm font-semibold text-primary-700 underline">Quitar el filtro</button>}
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" aria-label="Todos los paquetes">
          <thead>
            <tr className="border-b border-surface-200 bg-white">
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-surface-600">Código</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-surface-600">Ruta</th>
              <th scope="col" className="hidden px-4 py-3 text-left text-xs font-semibold text-surface-600 md:table-cell">Destinatario</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-surface-600">Estado</th>
              <th scope="col" className="hidden px-4 py-3 text-left text-xs font-semibold text-surface-600 lg:table-cell">Viaje</th>
              <th scope="col" className="hidden px-4 py-3 text-left text-xs font-semibold text-surface-600 lg:table-cell">Registrado</th>
              <th scope="col" className="hidden px-4 py-3 text-right text-xs font-semibold text-surface-600 sm:table-cell">Peso</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
            {packages.map((pkg) => (
              <tr key={pkg.id} className="transition-colors hover:bg-primary-50/40">
                <td className="px-4 py-3">
                  <Link to={`/logistics/packages/${pkg.id}`} className="inline-flex min-h-11 items-center font-mono text-xs font-bold text-primary-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500">
                    {pkg.tracking_code}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-surface-900">{pkg.origen} → {pkg.destino}</td>
                <td className="hidden px-4 py-3 text-sm text-surface-700 md:table-cell">{pkg.recipient_name || '—'}</td>
                <td className="px-4 py-3"><Badge variant={packageStatusVariant(pkg.status)} dot>{packageStatusLabel(pkg.status)}</Badge></td>
                <td className="hidden px-4 py-3 text-sm text-surface-600 lg:table-cell">{formatTripLabel(pkg)}</td>
                <td className="hidden px-4 py-3 text-sm text-surface-600 lg:table-cell">{created(pkg.created_at)}</td>
                <td className="hidden px-4 py-3 text-right text-sm tabular-nums text-surface-700 sm:table-cell">{pkg.peso != null ? `${pkg.peso} kg` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-surface-100 px-4 py-3 text-xs text-surface-600" role="status">
        {packages.length === 1 ? '1 paquete' : `${packages.length} paquetes`}
        {truncatedAt ? ` · se muestran los ${truncatedAt} más recientes: usa el buscador para encontrar uno más antiguo` : ''}
      </p>
    </div>
  );
}
