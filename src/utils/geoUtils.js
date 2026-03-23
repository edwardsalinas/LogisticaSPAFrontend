/**
 * Calcula la distancia entre dos puntos (lat/lng) en metros usando la fórmula de Haversine.
 */
export const haversineDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371e3; // Radio de la Tierra en metros
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Calcula el progreso de un viaje en base a checkpoints alcanzados y paquetes entregados.
 */
export const calculateTripProgress = (totalCheckpoints, reachedCheckpoints, totalPackages, deliveredPackages) => {
  const cpWeight = 0.4; // 40% peso checkpoints
  const pkgWeight = 0.6; // 60% peso paquetes
  
  const cpProgress = totalCheckpoints > 0 ? (reachedCheckpoints / totalCheckpoints) : 1;
  const pkgProgress = totalPackages > 0 ? (deliveredPackages / totalPackages) : 1;
  
  return Math.round((cpProgress * cpWeight + pkgProgress * pkgWeight) * 100);
};
