/**
 * AiRouteCard - Card embebida en respuestas del AI para mostrar información de ruta
 * @param {Object} route - Datos de la ruta {name, status, destination, eta}
 * @param {function} onViewMap - Callback al hacer click en "View on Map"
 */
function AiRouteCard({ route, onViewMap }) {
  const statusConfig = {
    active: { label: 'En Progreso', variant: 'success' },
    pending: { label: 'Pendiente', variant: 'warning' },
    completed: { label: 'Completada', variant: 'neutral' },
    delayed: { label: 'Retrasada', variant: 'danger' },
  };

  const status = statusConfig[route.status] || { label: route.status, variant: 'neutral' };

  return (
    <div className="ai-route-card bg-white border border-surface-200 rounded-lg p-4 my-3 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center text-xl">
            🚛
          </div>
          <div>
            <h4 className="font-semibold text-surface-900">{route.name || 'Ruta RT-001'}</h4>
            <p className="text-xs text-surface-500">{route.destination || 'La Paz → Oruro'}</p>
          </div>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          status.variant === 'success' ? 'bg-success/10 text-success' :
          status.variant === 'warning' ? 'bg-warning/10 text-warning' :
          status.variant === 'danger' ? 'bg-danger/10 text-danger' :
          'bg-surface-100 text-surface-600'
        }`}>
          {status.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-xs text-surface-500 uppercase">Vehículo</p>
          <p className="text-sm font-semibold text-surface-900">{route.vehicle || 'Volvo FH16'}</p>
        </div>
        <div>
          <p className="text-xs text-surface-500 uppercase">ETA</p>
          <p className="text-sm font-semibold text-surface-900">{route.eta || '14:30'}</p>
        </div>
      </div>

      <button
        onClick={onViewMap}
        className="ai-route-card__btn w-full py-2 text-sm font-medium text-primary-500 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
      >
        📍 View on Map
      </button>
    </div>
  );
}

export default AiRouteCard;
