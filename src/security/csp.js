/**
 * Política de contenido (CSP) y cabeceras de la página. Es la única fuente: nginx.conf lleva una copia (una prueba comprueba que coinciden)
 * y scripts/serve-csp.mjs la usa para probarla en un navegador real.
 *
 * Qué impide: scripts de otros sitios (aunque alguien lograra inyectar HTML, no se cargaría su código), enviar datos a servidores ajenos
 * (connect-src cerrado a la propia API y a los dos servicios de mapas), y que otro sitio muestre la aplicación en un marco.
 * Lo único «abierto» es style-src 'unsafe-inline': Leaflet y React ponen estilos en línea; los scripts NO tienen esa excepción.
 */
export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': ["'self'", 'https://challenges.cloudflare.com'],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'blob:', 'https://tile.openstreetmap.org', 'https://*.tile.openstreetmap.org', 'https://www.transparenttextures.com'],
  'font-src': ["'self'", 'data:'],
  'connect-src': ["'self'", 'https://router.project-osrm.org', 'https://nominatim.openstreetmap.org'],
  'frame-src': ['https://challenges.cloudflare.com'],
  'worker-src': ["'self'", 'blob:'],
  'media-src': ["'self'", 'blob:'],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'self'"],
};

export const buildCsp = ({ extraConnect = [] } = {}) =>
  Object.entries({ ...CSP_DIRECTIVES, 'connect-src': [...CSP_DIRECTIVES['connect-src'], ...extraConnect] })
    .map(([k, v]) => `${k} ${v.join(' ')}`)
    .join('; ');

export const PERMISSIONS_POLICY = 'microphone=(self), geolocation=(self), camera=(), payment=()';
