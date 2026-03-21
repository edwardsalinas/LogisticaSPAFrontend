import { ArrowRight, Clock3, LocateFixed, Truck, Edit2, Trash2 } from 'lucide-react';
import Avatar from '../../../components/atoms/Avatar';
import Badge from '../../../components/atoms/Badge';
import ProgressBar from '../../../components/atoms/ProgressBar';
import useRole from '../../../app/useRole';

function RouteCard({ route, isSelected = false, onClick, onEdit, onDelete }) {
  const { hasRole } = useRole();
  const statusConfig = {
    active: { label: 'En progreso', variant: 'info' },
    pending: { label: 'Pendiente', variant: 'warning' },
    completed: { label: 'Completada', variant: 'success' },
    delayed: { label: 'Retrasada', variant: 'danger' },
  };

  const status = statusConfig[route.status] || { label: route.status, variant: 'neutral' };
  const progress = route.progress || 0;

  return (
    <div
      className={`motion-card cursor-pointer rounded-[1.25rem] sm:rounded-[1.35rem] border p-4 transition-all duration-250 ${
        isSelected
          ? 'border-primary-200 bg-primary-50 shadow-[0_18px_40px_-34px_rgba(11,78,162,0.4)]'
          : 'border-surface-100 bg-white hover:border-surface-200 hover:bg-surface-50 hover:shadow-[0_18px_42px_-34px_rgba(15,23,42,0.25)]'
      }`}
      onClick={onClick}
    >
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm font-bold tracking-[0.02em] text-surface-900">{route.route_code || `RT-${route.id?.substring(0, 6).toUpperCase()}`}</span>
        <Badge variant={status.variant} dot>{status.label}</Badge>
      </div>

      <div className="mb-3 flex items-center gap-3">
        <Avatar name={route.driver_name || 'Conductor'} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-surface-900">{route.driver_name || 'Sin asignar'}</p>
          <p className="flex flex-wrap items-center gap-1.5 text-xs text-surface-500">
            <Truck size={13} strokeWidth={2.1} />
            {route.vehicle_brand || '--'} - {route.plate_number || '--'}
          </p>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2 text-sm text-surface-700">
        <span className="truncate">{route.origin || 'Origen'}</span>
        <ArrowRight size={14} strokeWidth={2.2} className="shrink-0 text-surface-300" />
        <span className="truncate">{route.destination || 'Destino'}</span>
      </div>

      <div className="mb-3">
        <ProgressBar value={progress} size="sm" variant={progress === 100 ? 'success' : progress >= 50 ? 'primary' : 'warning'} showLabel />
      </div>

      <div className="grid grid-cols-1 gap-2 text-xs text-surface-500 sm:grid-cols-2 sm:gap-3">
        <div className="flex items-center gap-2 rounded-xl bg-surface-50 px-3 py-2 min-w-0">
          <LocateFixed size={13} strokeWidth={2.2} className="shrink-0" />
          <span className="truncate">{route.next_checkpoint || 'Sin checkpoint'}</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-surface-50 px-3 py-2 min-w-0">
          <Clock3 size={13} strokeWidth={2.2} className="shrink-0" />
          <span className="truncate">ETA {route.eta || '--'}</span>
        </div>
      </div>

      {hasRole(['admin', 'logistics_operator']) && (onEdit || onDelete) && (
        <div className="mt-3 flex justify-end gap-2 border-t border-surface-100 pt-3">
          {onEdit && (
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(); }} 
              className="flex items-center gap-1.5 rounded-lg bg-surface-50 px-3 py-1.5 text-xs font-semibold text-surface-600 transition-colors hover:bg-surface-200 hover:text-surface-900"
            >
              <Edit2 size={13} strokeWidth={2.2} /> Editar
            </button>
          )}
          {onDelete && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(); }} 
              className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 hover:text-red-700"
            >
              <Trash2 size={13} strokeWidth={2.2} /> Borrar
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default RouteCard;
