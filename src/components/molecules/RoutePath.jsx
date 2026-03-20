import { Polyline } from 'react-leaflet';

/**
 * Componente para dibujar la ruta entre checkpoints
 */
function RoutePath({ checkpoints, color = '#137fec', weight = 4 }) {
  if (!checkpoints || checkpoints.length === 0) return null;

  // Convertir checkpoints a array de posiciones [lat, lng]
  const positions = checkpoints.map((cp) => [cp.lat, cp.lng]);

  return (
    <Polyline
      positions={positions}
      pathOptions={{
        color,
        weight,
        opacity: 0.8,
        dashArray: '10, 10', // Línea punteada
        lineCap: 'round',
      }}
    />
  );
}

export default RoutePath;
