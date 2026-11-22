import { z } from 'zod';
import { isInsideBolivia } from './bolivia';

/** Mensaje cuando falta la ubicación (el usuario no ve "latitud": ve que debe elegir un lugar). */
export const LOCATION_REQUIRED = 'Elige una ubicación (ciudad, tu posición o un punto en el mapa)';

/** Coordenada numérica; un campo vacío NO se convierte en 0 (z.coerce.number('') daría 0 y guardaría un punto en el océano). */
export const coordinate = (range, label) =>
  z.preprocess(
    (v) => (v === '' || v == null ? undefined : v),
    z.coerce.number({ message: LOCATION_REQUIRED }).min(-range, `La ${label} debe estar entre -${range} y ${range}`).max(range, `La ${label} debe estar entre -${range} y ${range}`),
  );

export const latField = () => coordinate(90, 'latitud');
export const lngField = () => coordinate(180, 'longitud');

/** Para usar en `.superRefine` de un objeto con `lat` y `lng`: la ubicación debe caer en Bolivia. */
export const requireInsideBolivia = (v, ctx) => {
  if (!isInsideBolivia(v.lat, v.lng)) {
    ctx.addIssue({ code: 'custom', path: ['lat'], message: 'Esa ubicación queda fuera de Bolivia. Revisa la ciudad o las coordenadas.' });
  }
};
