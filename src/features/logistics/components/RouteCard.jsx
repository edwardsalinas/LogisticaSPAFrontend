import { ArrowRight, Clock3, LocateFixed, Truck, Edit2, Trash2 } from 'lucide-react';
import Avatar from '../../../components/atoms/Avatar';
import Badge from '../../../components/atoms/Badge';
import ProgressBar from '../../../components/atoms/ProgressBar';
import useRole from '../../../app/useRole';

function RouteCard({ route, isSelected = false, onClick, onEdit, onDelete }) {
  const { hasRole } = useRole();
  const statusConfig = {
    active: { label: 'En progreso', variant: 'info' },
    en_progreso: { label: 'En progreso', variant: 'success' },
    pending: { label: 'Pendiente', variant: 'warning' },
    pendiente: { label: 'Pendiente', variant: 'warning' },
    planeada: { label: 'Planeada', variant: 'warning' },
    planned: { label: 'Planeada', variant: 'warning' },
    completed: { label: 'Completada', variant: 'neutral' },
    completada: { label: 'Completada', variant: 'neutral' },
    finalizada: { label: 'Finalizada', variant: 'neutral' },
    delayed: { label: 'Retrasada', variant: 'danger' },
    retrasada: { label: 'Retrasada', variant: 'danger' },
    schedule: { label: 'Cronograma', variant: 'primary' },
  };

  const isSchedule = route.type === 'schedule';
  const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  let scheduleFreq = '';
  if (isSchedule && route.day_times) {
    const days = Object.keys(route.day_times).map(Number).sort();
    if (days.length === 7) scheduleFreq = 'Todos los días';
    else if (days.length > 0) scheduleFreq = days.map(d => DAY_NAMES[d]).join(', ');
    else scheduleFreq = 'Sin días asignados';
  }

  const status = statusConfig[route.status] || { label: route.status, variant: 'neutral' };
  const progress = route.progress || 0;

  return (
    <div
      className={`motion-card cursor-pointer rounded-[1.5rem] border p-5 transition-all duration-300 relative group overflow-hidden ${
        isSelected
          ? 'border-primary-200 bg-primary-50/50 shadow-[0_20px_50px_-30px_rgba(37,99,235,0.3)] ring-1 ring-primary-100'
          : 'border-surface-100 bg-white hover:border-surface-200 hover:bg-surface-50/50 hover:shadow-[0_20px_50px_-30px_rgba(15,23,42,0.15)]'
      }`}
      onClick={onClick}
    >
      {/* Indicador lateral de estado */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
        status.variant === 'success' || status.variant === 'info' ? 'bg-emerald-500' : 
        status.variant === 'warning' ? 'bg-amber-400' : 
        status.variant === 'danger' ? 'bg-rose-500' : 'bg-slate-400'
      } opacity-80`} />

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-surface-400 leading-none mb-1.5">Identificador</span>
          <span className="text-sm font-black text-surface-900 tracking-tight leading-none group-hover:text-primary-600 transition-colors">
            {route.route_code || `RT-${String(route.id || '').substring(0, 6).toUpperCase()}`}
          </span>
        </div>
        <Badge variant={status.variant} className="px-2.5 py-1 text-[10px] uppercase font-black tracking-wider ring-1 ring-black/5">{status.label}</Badge>
      </div>

      <div className="mb-4 flex items-center gap-3.5">
        <div className="relative">
          <Avatar name={route.driver_name || 'Conductor'} size="sm" className="ring-2 ring-white shadow-md" />
          {status.variant === 'success' && (
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold text-surface-900 leading-tight">{route.driver_name || 'Sin asignar'}</p>
          <div className="mt-1 flex items-center gap-2">
            <div className="flex items-center gap-1 text-[10px] font-bold text-surface-500 uppercase tracking-tighter">
              <Truck size={12} strokeWidth={2.5} className="text-primary-500" />
              {route.plate_number || '--'}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-5 flex items-center gap-3 rounded-xl bg-surface-50/80 p-3 border border-surface-100/50">
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-[9px] font-black text-surface-400 uppercase tracking-widest leading-none mb-1">Tramo</span>
          <div className="flex items-center gap-2 text-xs font-bold text-surface-800">
            <span className="truncate">{route.origin || 'Ori'}</span>
            <ArrowRight size={12} strokeWidth={3} className="shrink-0 text-primary-400/60" />
            <span className="truncate">{route.destination || 'Des'}</span>
          </div>
        </div>
      </div>

      {!isSchedule ? (
        <>
          <div className="mb-4 px-1">
             <div className="flex justify-between items-center mb-1.5">
               <span className="text-[10px] font-black text-surface-400 uppercase tracking-widest">Progreso</span>
               <span className="text-[10px] font-black text-primary-600">{progress}%</span>
             </div>
             <ProgressBar 
               value={progress} 
               size="xs" 
               variant={progress === 100 ? 'success' : progress >= 1 ? 'primary' : 'warning'} 
               className="rounded-full overflow-hidden h-1.5 shadow-inner bg-surface-100"
             />
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
            <div className="flex items-center gap-1.5 rounded-lg border border-surface-100 bg-white px-2 py-1.5 text-surface-600 min-w-0">
              <LocateFixed size={12} strokeWidth={2.5} className="shrink-0 text-amber-500" />
              <span className="truncate uppercase tracking-tighter">{route.next_checkpoint || 'Paquete...'}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-surface-100 bg-white px-2 py-1.5 text-surface-600 min-w-0">
              <Clock3 size={12} strokeWidth={2.5} className="shrink-0 text-primary-500" />
              <span className="truncate">ETA {route.eta || '--'}</span>
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-2 rounded-xl bg-primary-50/50 px-3 py-3 min-w-0 border border-primary-100/50">
          <Clock3 size={15} strokeWidth={2.5} className="shrink-0 text-primary-600" />
          <div className="min-w-0">
            <p className="text-[9px] font-black text-primary-600 uppercase tracking-[0.15em] leading-none mb-1">Recurrencia</p>
            <p className="text-[11px] font-bold text-surface-900 truncate">{scheduleFreq}</p>
          </div>
        </div>
      )}

      {hasRole(['admin', 'logistics_operator']) && (onEdit || onDelete) && (
        <div className="mt-5 flex items-center justify-between border-t border-surface-100/60 pt-4">
          <div className="flex gap-1.5">
            {onEdit && (
              <button 
                onClick={(e) => { e.stopPropagation(); onEdit(); }} 
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-50 text-surface-500 transition-all hover:bg-primary-50 hover:text-primary-600 active:scale-90"
                title="Editar"
              >
                <Edit2 size={13} strokeWidth={2.5} />
              </button>
            )}
            {onDelete && (
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(); }} 
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-50 text-surface-500 transition-all hover:bg-rose-50 hover:text-rose-600 active:scale-90"
                title="Eliminar"
              >
                <Trash2 size={13} strokeWidth={2.5} />
              </button>
            )}
          </div>
          <div className="text-[10px] font-black uppercase tracking-tighter text-surface-300">
            {isSchedule ? 'Autómata' : 'Venta Única'}
          </div>
        </div>
      )}
    </div>
  );
}

export default RouteCard;
