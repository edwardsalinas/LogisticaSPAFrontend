/** Ciudades de Bolivia con coordenadas, para elegir una ubicación por nombre en vez de teclear latitud y longitud. */
export const BOLIVIA_CITIES = [
  { key: 'la-paz', name: 'La Paz', lat: -16.4897, lng: -68.1193 },
  { key: 'el-alto', name: 'El Alto', lat: -16.5, lng: -68.1633 },
  { key: 'viacha', name: 'Viacha', lat: -16.6525, lng: -68.2992 },
  { key: 'achacachi', name: 'Achacachi', lat: -16.0486, lng: -68.6431 },
  { key: 'patacamaya', name: 'Patacamaya', lat: -17.2333, lng: -67.9167 },
  { key: 'caracollo', name: 'Caracollo', lat: -17.6333, lng: -67.2167 },
  { key: 'oruro', name: 'Oruro', lat: -17.9647, lng: -67.1061 },
  { key: 'cochabamba', name: 'Cochabamba', lat: -17.3895, lng: -66.1568 },
  { key: 'potosi', name: 'Potosí', lat: -19.5836, lng: -65.7531 },
  { key: 'sucre', name: 'Sucre', lat: -19.0196, lng: -65.2619 },
  { key: 'tarija', name: 'Tarija', lat: -21.5355, lng: -64.7296 },
  { key: 'santa-cruz', name: 'Santa Cruz de la Sierra', lat: -17.7833, lng: -63.1821, aliases: ['santa cruz'] },
  { key: 'trinidad', name: 'Trinidad', lat: -14.8333, lng: -64.9 },
  { key: 'cobija', name: 'Cobija', lat: -11.0267, lng: -68.7692 },
];

/** Límites aproximados del país: fuera de esto, una coordenada casi seguro es un error de tecleo. */
export const BOLIVIA_BOUNDS = { latMin: -22.9, latMax: -9.6, lngMin: -69.7, lngMax: -57.4 };

export const isInsideBolivia = (lat, lng) =>
  lat >= BOLIVIA_BOUNDS.latMin && lat <= BOLIVIA_BOUNDS.latMax && lng >= BOLIVIA_BOUNDS.lngMin && lng <= BOLIVIA_BOUNDS.lngMax;

const normalize = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

/** Ciudad conocida a partir de un texto libre ("Cochabamba", "Av. Blanco Galindo, Santa Cruz"...). null si no hay coincidencia. */
export const matchCity = (text) => {
  const t = normalize(text);
  if (!t) return null;
  return (
    BOLIVIA_CITIES.find((c) => [c.name, ...(c.aliases ?? [])].some((n) => t.includes(normalize(n)))) ?? null
  );
};

export const cityByKey = (key) => BOLIVIA_CITIES.find((c) => c.key === key) ?? null;

/** Ciudad más cercana a un punto (para decir "cerca de Oruro" cuando la ubicación viene del GPS o del mapa). */
export const nearestCity = (lat, lng) => {
  let best = null;
  let bestD = Infinity;
  for (const c of BOLIVIA_CITIES) {
    const d = (c.lat - lat) ** 2 + ((c.lng - lng) * Math.cos((lat * Math.PI) / 180)) ** 2;
    if (d < bestD) { bestD = d; best = c; }
  }
  const km = Math.sqrt(bestD) * 111;
  return best ? { city: best, km } : null;
};
