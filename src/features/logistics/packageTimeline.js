import { normalizePackageStatus, packageStatusLabel, PACKAGE_STATUS } from '../../constants/status';

const TZ = 'America/La_Paz';
const when = (iso) => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleString('es-BO', { timeZone: TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null;
};

/**
 * Los pasos de «Secuencia de entrega» a partir del historial REAL del paquete (cada evento con su hora y su nota), del más antiguo al más
 * reciente. Antes la ficha mostraba una secuencia fija de ejemplo («19 Mar, 08:30…») para todos los paquetes. Sin historial se muestra solo
 * el registro del paquete. El último paso queda activo, salvo que el paquete ya esté entregado.
 */
export const timelineFromLogs = (logs = [], pkg = null) => {
  const sorted = [...logs].filter((l) => l?.status).sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  if (sorted.length === 0) {
    if (!pkg) return [];
    return [{ label: 'Registrado', date: when(pkg.created_at), location: `${pkg.origen} → ${pkg.destino}`, completed: false, active: true }];
  }
  const delivered = normalizePackageStatus(sorted[sorted.length - 1].status) === PACKAGE_STATUS.DELIVERED;
  return sorted.map((l, i) => {
    const last = i === sorted.length - 1;
    return {
      label: packageStatusLabel(l.status),
      date: when(l.timestamp),
      location: l.observations || null,
      completed: !last || delivered,
      active: last && !delivered,
    };
  });
};
