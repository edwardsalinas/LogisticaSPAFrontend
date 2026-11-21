/**
 * Estados de paquetes y rutas. Son los MISMOS valores que usa el backend
 * (LogisticaSPABackend/src/modules/logistics/logistics.schema.js).
 *
 * Antes varias pantallas comparaban contra estados en inglés ('delivered', 'in_transit', 'active'...)
 * que el backend nunca envía, por lo que la línea de tiempo del paquete no avanzaba y los paquetes
 * entregados no se reconocían. Estas funciones aceptan también los alias antiguos para no romper datos viejos.
 */
export const PACKAGE_STATUS = {
  PENDING: 'pendiente',
  ASSIGNED: 'asignado',
  IN_TRANSIT: 'en_transito',
  AT_AGENCY: 'en_agencia',
  DELIVERED: 'entregado',
  INCIDENT: 'siniestro',
  RETURNED: 'devuelto',
  CANCELLED: 'cancelado',
};

export const ROUTE_STATUS = {
  PLANNED: 'planeada',
  ACTIVE: 'en_transito',
  COMPLETED: 'completada',
};

const PACKAGE_ALIASES = {
  pending: PACKAGE_STATUS.PENDING,
  assigned: PACKAGE_STATUS.ASSIGNED,
  in_transit: PACKAGE_STATUS.IN_TRANSIT,
  delivered: PACKAGE_STATUS.DELIVERED,
  completada: PACKAGE_STATUS.DELIVERED,
  cancelled: PACKAGE_STATUS.CANCELLED,
  at_agency: PACKAGE_STATUS.AT_AGENCY,
  incident: PACKAGE_STATUS.INCIDENT,
  returned: PACKAGE_STATUS.RETURNED,
};

const ROUTE_ALIASES = {
  planned: ROUTE_STATUS.PLANNED,
  pending: ROUTE_STATUS.PLANNED,
  active: ROUTE_STATUS.ACTIVE,
  completed: ROUTE_STATUS.COMPLETED,
  finalizada: ROUTE_STATUS.COMPLETED,
  terminada: ROUTE_STATUS.COMPLETED,
  entregado: ROUTE_STATUS.COMPLETED,
};

const clean = (status) => String(status ?? '').trim().toLowerCase();

export const normalizePackageStatus = (status) => PACKAGE_ALIASES[clean(status)] || clean(status);
export const normalizeRouteStatus = (status) => ROUTE_ALIASES[clean(status)] || clean(status);

export const isPackageDelivered = (status) => normalizePackageStatus(status) === PACKAGE_STATUS.DELIVERED;
export const isRouteFinished = (status) => normalizeRouteStatus(status) === ROUTE_STATUS.COMPLETED;
export const isRouteActive = (status) => normalizeRouteStatus(status) === ROUTE_STATUS.ACTIVE;
export const isPackageIncident = (status) => normalizePackageStatus(status) === PACKAGE_STATUS.INCIDENT;
