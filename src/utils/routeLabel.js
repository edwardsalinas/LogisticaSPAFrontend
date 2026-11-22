const TZ = 'America/La_Paz';

const departure = (route) => route?.departure_time ?? route?.scheduled_departure ?? null;

/** "22 nov, 06:30" en hora de Bolivia, o '' si no hay fecha válida. */
export const routeWhen = (route) => {
  const iso = departure(route);
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('es-BO', { timeZone: TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
};

/** "La Paz → Caracollo" (o '' si faltan los extremos). */
export const routeTitle = (route) => (route?.origin && route?.destination ? `${route.origin} → ${route.destination}` : '');

/**
 * Cómo llamar a una ruta ante el usuario. Usa el código si la ruta tiene uno; si no, la descripción del trayecto
 * ("La Paz → Caracollo"), nunca un pedazo del UUID (RT-A76E66 no significa nada para nadie).
 */
export const routeName = (route) => route?.route_code || routeTitle(route) || 'Ruta sin nombre';

/** Nombre más la salida: "La Paz → Caracollo · 22 nov, 06:30". Para listas donde hay varias rutas parecidas. */
export const routeLabel = (route) => [routeName(route), routeWhen(route)].filter(Boolean).join(' · ');
