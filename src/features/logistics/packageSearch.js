/**
 * Búsqueda de paquetes que comparten el tablero, la lista «Todos», la ficha y Seguimiento: sin importar mayúsculas ni tildes, y por código,
 * origen, destino, destinatario, remitente o estado («pendiente», «en transito»).
 */
export const plain = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export const matchesPackage = (pkg, term) => {
  const t = plain(term).trim();
  if (!t) return true;
  return [pkg.tracking_code, pkg.origen, pkg.destino, pkg.recipient_name, pkg.sender_name, String(pkg.status ?? '').replace(/_/g, ' ')]
    .some((value) => plain(value).includes(t));
};

/** El día en que sale el viaje del paquete (hora de Bolivia), o null si no tiene viaje. */
export const tripDate = (pkg) => {
  const iso = pkg?.transport_routes?.departure_time;
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
};

export const formatTripLabel = (pkg) => {
  const d = tripDate(pkg);
  if (!d) return pkg?.route_id ? 'Con viaje' : 'Sin viaje';
  return `Viaje del ${d.toLocaleString('es-BO', { timeZone: 'America/La_Paz', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
};
