const TZ = 'America/La_Paz';
const HOUR_MS = 3600 * 1000;

const ymd = (t) => new Date(t).toLocaleDateString('es-BO', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

/** Hora local de Bolivia como número entero 0-23 (para reconocer «el de las ocho»). */
export const localHour = (iso) => Number(new Date(iso).toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }));

export const timeText = (iso) => new Date(iso).toLocaleTimeString('es-BO', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });

export const dayText = (iso, now = Date.now()) => {
  if (ymd(iso) === ymd(now)) return 'hoy';
  if (ymd(iso) === ymd(now + 24 * HOUR_MS)) return 'mañana';
  const near = Math.abs(Date.parse(iso) - now) < 6 * 24 * HOUR_MS;
  return new Date(iso).toLocaleDateString('es-BO', near ? { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' } : { timeZone: TZ, day: 'numeric', month: 'long' });
};

/** «el viaje de La Paz a Oruro de mañana a las 08:30»: así se habla de un viaje con la persona, nunca por su identificador. */
export const tripText = ({ origin, destination, departure_time: departure } = {}, now = Date.now()) => {
  const route = origin && destination ? `el viaje de ${origin} a ${destination}` : 'el viaje';
  if (!departure || Number.isNaN(Date.parse(departure))) return route;
  const day = dayText(departure, now);
  return `${route} ${day === 'hoy' || day === 'mañana' ? `de ${day}` : `del ${day}`} a las ${timeText(departure)}`;
};
