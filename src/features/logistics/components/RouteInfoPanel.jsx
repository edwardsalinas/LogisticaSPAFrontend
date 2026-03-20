import Button from '../../../components/atoms/Button';

/**
 * RouteInfoPanel - Panel overlay con información de ruta seleccionada
 * @param {Object} route - Datos de la ruta
 * @param {function} onClose - Callback para cerrar panel
 */
function RouteInfoPanel({ route, onClose }) {
  if (!route) return null;

  return (
    <div className="route-info-panel absolute top-4 right-4 z-[1000] w-80 bg-white rounded-lg shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-primary-500 text-white p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold">{route.route_code || `RT-${route.id?.substring(0, 6).toUpperCase()}`}</h3>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        <p className="text-sm text-primary-100">
          {route.origin} → {route.destination}
        </p>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        {/* Próxima parada */}
        <div>
          <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-1">
            Próxima Parada
          </p>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📍</span>
            <div>
              <p className="text-sm font-semibold text-surface-900">
                {route.next_checkpoint || 'Centro Logístico Norte'}
              </p>
              <p className="text-xs text-surface-500">
                ETA: {route.eta || '14:30'} ({route.eta_minutes || '25'} min)
              </p>
            </div>
          </div>
        </div>

        {/* Distancia restante */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-1">
              Distancia Restante
            </p>
            <p className="text-lg font-bold text-surface-900">
              {route.remaining_distance || '45.2'} km
            </p>
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-1">
              Progreso
            </p>
            <p className="text-lg font-bold text-surface-900">
              {route.progress || 65}%
            </p>
          </div>
        </div>

        {/* Conductor */}
        <div className="border-t border-surface-200 pt-4">
          <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-2">
            Conductor Asignado
          </p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold text-sm">
              {(route.driver_name || 'C').charAt(0)}
            </div>
            <div>
              <p className="text-sm font-medium text-surface-900">
                {route.driver_name || 'Juan Pérez'}
              </p>
              <p className="text-xs text-surface-500">
                {route.driver_phone || '+591 70012345'}
              </p>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="primary" 
            size="sm" 
            className="flex-1"
            onClick={() => window.open(`/tracking/${route.package_id}/map`, '_blank')}
          >
            📍 Ver en Mapa
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            className="flex-1"
          >
            📞 Contactar
          </Button>
        </div>

        {/* Link a historial */}
        <div className="text-center">
          <button className="text-xs text-primary-500 hover:text-primary-600 font-medium">
            Ver historial completo de ruta →
          </button>
        </div>
      </div>
    </div>
  );
}

export default RouteInfoPanel;
