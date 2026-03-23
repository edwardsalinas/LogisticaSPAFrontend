import { Polyline, Tooltip } from 'react-leaflet';

/**
 * Componente para dibujar el rastro histórico de GPS (lo que ya se recorrió)
 */
function HistoryPath({ logs = [] }) {
  if (!logs || logs.length < 2) return null;

  // Extraer coordenadas de los logs
  const positions = logs
    .filter(log => log.lat && log.lng)
    .map(log => [log.lat, log.lng]);

  if (positions.length < 2) return null;

  const pathOptions = {
    color: '#3b82f6', // primary-500 o un azul similar al solicitado
    weight: 3,
    opacity: 0.8,
    dashArray: '5, 8', // Línea punteada/discontinua
    lineJoin: 'round',
  };

  return (
    <Polyline 
      positions={positions} 
      pathOptions={pathOptions}
    >
      <Tooltip sticky>Senda recorrida real (GPS)</Tooltip>
    </Polyline>
  );
}

export default HistoryPath;
