import ProgressBar from '../../../components/atoms/ProgressBar';
import Badge from '../../../components/atoms/Badge';
import Avatar from '../../../components/atoms/Avatar';

/**
 * RouteCard - Tarjeta de ruta para lista de monitoreo
 * @param {Object} route - Datos de la ruta
 * @param {boolean} isSelected - Si está seleccionada
 * @param {function} onClick - Callback al hacer click
 */
function RouteCard({ route, isSelected = false, onClick }) {
  const statusConfig = {
    active: { label: 'EN PROGRESO', variant: 'info' },
    pending: { label: 'POR INICIAR', variant: 'warning' },
    completed: { label: 'COMPLETADA', variant: 'success' },
    delayed: { label: 'DEMORADO', variant: 'danger' },
  };

  const status = statusConfig[route.status] || { label: route.status, variant: 'neutral' };

  // Calcular progreso basado en checkpoints visitados
  const progress = route.progress || Math.floor(Math.random() * 100);

  // Mensaje descriptivo según estado
  const getStatusMessage = () => {
    if (route.status === 'active') {
      return `📍 En ruta hacia ${route.destination}`;
    }
    if (route.status === 'delayed') {
      return '⚠️ Retraso reportado por tráfico';
    }
    if (route.status === 'completed') {
      return '✅ Ruta completada exitosamente';
    }
    return '⏳ Esperando asignación';
  };

  return (
    <div
      className={`route-card p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'route-card--selected border-primary-500 bg-primary-50'
          : 'route-card--default border-transparent bg-white hover:border-surface-200 hover:shadow-md'
      }`}
      onClick={onClick}
    >
      {/* Header: ID + Badge */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-surface-900">{route.route_code || `RT-${route.id?.substring(0, 6).toUpperCase()}`}</span>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>

      {/* Conductor + Vehículo */}
      <div className="flex items-center gap-3 mb-3">
        <Avatar name={route.driver_name || 'Conductor'} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-surface-900 truncate">
            {route.driver_name || 'Sin asignar'}
          </p>
          <p className="text-xs text-surface-500">
            {route.vehicle_brand || '—'} • {route.plate_number || '—'}
          </p>
        </div>
      </div>

      {/* Ruta */}
      <div className="flex items-center gap-2 mb-3 text-sm">
        <span className="text-surface-600">{route.origin || 'Origen'}</span>
        <span className="text-surface-400">→</span>
        <span className="text-surface-600">{route.destination || 'Destino'}</span>
      </div>

      {/* Barra de progreso */}
      <div className="mb-2">
        <ProgressBar 
          value={progress} 
          size="sm" 
          variant={
            progress === 100 ? 'success' :
            progress >= 50 ? 'primary' : 'warning'
          }
          showLabel
        />
      </div>

      {/* Mensaje de estado */}
      <p className="text-xs text-surface-500">
        {getStatusMessage()}
      </p>
    </div>
  );
}

export default RouteCard;
