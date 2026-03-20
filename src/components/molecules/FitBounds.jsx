import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

/**
 * Componente para ajustar el viewport del mapa a los límites de los checkpoints
 */
function FitBounds({ checkpoints, padding = 50 }) {
  const map = useMap();

  useEffect(() => {
    if (!checkpoints || checkpoints.length === 0) return;

    const bounds = checkpoints.map((cp) => [cp.lat, cp.lng]);
    map.fitBounds(bounds, {
      padding: [padding, padding],
      maxZoom: 14,
    });
  }, [checkpoints, map, padding]);

  return null;
}

export default FitBounds;
