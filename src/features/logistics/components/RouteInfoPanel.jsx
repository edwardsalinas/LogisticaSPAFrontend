import { Clock3, MapPinned, Phone, Route, X, Edit2, Trash2, PackageCheck, Truck } from 'lucide-react';
import Button from '../../../components/atoms/Button';
import useRole from '../../../app/useRole';

function RouteInfoPanel({ route, onClose, onEdit, onDelete, onAssign, realProgress, realRemainingDistance }) {
  const { hasRole } = useRole();
  if (!route) return null;

  const isSchedule = route.type === 'schedule';
  const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  let scheduleFreq = '';
  if (isSchedule && route.day_times) {
    const days = Object.keys(route.day_times).map(Number).sort();
    if (days.length === 7) scheduleFreq = 'Todos los días de la semana';
    else if (days.length > 0) scheduleFreq = days.map(d => DAY_NAMES[d]).join(', ');
    else scheduleFreq = 'Sin días asignados';
  }

  return    <div className="route-info-panel absolute right-4 top-4 z-[1000] w-[21.5rem] overflow-hidden rounded-[2rem] shadow-2xl bg-white/95 backdrop-blur-md border border-white/60">
      <div className="bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_100%)] p-6 text-white relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.15),transparent_40%)]" />
        <div className="relative mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-400/80 leading-none mb-2">Lectura de Ruta</p>
            <h3 className="font-black text-2xl tracking-tighter leading-none mb-1">{route.route_code || `RT-${String(route.id || '').substring(0, 6).toUpperCase()}`}</h3>
          </div>
          <button onClick={onClose} className="rounded-2xl bg-white/10 p-2.5 text-white/70 transition-all hover:bg-white/20 hover:text-white active:scale-90 flex-shrink-0">
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>
        <div className="relative flex items-center gap-2.5 text-xs font-bold text-slate-300">
           <span className="truncate">{route.origin}</span>
           <ArrowRight size={14} strokeWidth={3} className="text-blue-500/60" />
           <span className="truncate">{route.destination}</span>
        </div>
      </div>

      <div className="space-y-6 p-6">
        {!isSchedule ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-[1.4rem] border border-surface-100 bg-surface-50/50 p-4 transition-all hover:border-surface-200">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-surface-400">Progreso</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-surface-900 tracking-tight">{realProgress || route.progress || 0}</span>
                  <span className="text-xs font-bold text-surface-400">%</span>
                </div>
              </div>
              <div className="rounded-[1.4rem] border border-surface-100 bg-surface-50/50 p-4 transition-all hover:border-surface-200">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-surface-400">Distancia</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-surface-900 tracking-tight">{realRemainingDistance || route.remaining_distance || '--'}</span>
                  <span className="text-xs font-bold text-surface-400">km</span>
                </div>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-primary-100 bg-primary-50/30 p-4 group transition-all hover:bg-primary-50/50">
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-primary-600">Siguiente parada</p>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-500 text-white shadow-lg shadow-primary-200 group-hover:scale-110 transition-transform">
                  <MapPinned size={22} strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-surface-900 truncate leading-none mb-2">{route.next_checkpoint || 'Centro logistico norte'}</p>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-primary-700 bg-white px-2 py-1 rounded-lg border border-primary-100/50 shadow-sm"><Clock3 size={12} strokeWidth={2.5} /> ETA {route.eta || '14:30'}</span>
                    <span className="text-[10px] font-bold text-surface-400">{route.eta_minutes || '25'} min</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-[1.5rem] border border-primary-100 bg-primary-50/40 p-5">
            <p className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-primary-600">Frecuencia Automatizada</p>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-primary-600 shadow-md border border-primary-50">
                <Clock3 size={24} strokeWidth={3} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-surface-900 leading-snug mb-1">{scheduleFreq}</p>
                <p className="text-[10px] font-black text-primary-600/70 uppercase tracking-widest">Estado: Operativo</p>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-[1.5rem] border border-surface-100 bg-white p-4 shadow-sm">
           <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-surface-400">Responsable asignado</p>
           <div className="flex items-center gap-4">
             <div className="relative">
                <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#3b82f6_0%,#1e3a8a_100%)] text-base font-black text-white shadow-lg shadow-primary-100">{(route.driver_name || 'C').charAt(0)}</div>
                <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center shadow-sm">
                   <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                </div>
             </div>
             <div className="min-w-0">
               <p className="text-sm font-black text-surface-900 truncate leading-none mb-1.5">{route.driver_name || 'Juan Perez'}</p>
               <p className="flex items-center gap-1.5 text-xs font-bold text-surface-500"><Phone size={13} strokeWidth={2.5} className="text-emerald-600" /> {route.driver_phone || '+591 70012345'}</p>
             </div>
           </div>
        </div>

        <div className="flex gap-3 pt-2">
          {hasRole(['driver', 'admin', 'logistics_operator']) && (
            <Button 
              variant="primary" 
              className={`flex-1 h-12 rounded-2xl font-black text-[11px] uppercase tracking-widest gap-2 shadow-2xl transition-all ${(['completed', 'finalizada', 'completada'].includes(route.status)) ? 'bg-surface-200 text-surface-400 border-none shadow-none opacity-50' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200/50'}`} 
              onClick={() => {
                if (!(['completed', 'finalizada', 'completada'].includes(route.status))) {
                  window.open('/tracking/driver', '_self');
                }
              }}
              disabled={['completed', 'finalizada', 'completada'].includes(route.status)}
            >
              <Truck size={16} strokeWidth={3} />
              {(['completed', 'finalizada', 'completada'].includes(route.status)) ? 'Finalizado' : 'Iniciar'}
            </Button>
          )}
          <Button variant="secondary" className="flex-1 h-12 rounded-2xl font-black text-[11px] uppercase tracking-widest gap-2 bg-surface-50 border-surface-100 text-surface-700 active:scale-95" onClick={() => window.open(`/logistics/routes/${route.id}/map`, '_self')}>
            <Route size={16} strokeWidth={3} />
            Mapa
          </Button>
        </div>

        {hasRole(['admin', 'logistics_operator']) && (
          <div className="flex gap-2 pt-4 border-t border-surface-100/80 mt-2">
            <button onClick={() => onAssign?.(route)} className="flex-1 flex flex-col items-center justify-center gap-2 p-3 rounded-2xl hover:bg-primary-50 text-surface-400 hover:text-primary-600 transition-all border border-transparent hover:border-primary-100 group">
               <PackageCheck size={20} className="group-hover:scale-110 transition-transform" />
               <span className="text-[9px] font-black uppercase tracking-wider">Asignar</span>
            </button>
            <button onClick={() => onEdit?.(route)} className="flex-1 flex flex-col items-center justify-center gap-2 p-3 rounded-2xl hover:bg-amber-50 text-surface-400 hover:text-amber-600 transition-all border border-transparent hover:border-amber-100 group">
               <Edit2 size={20} className="group-hover:scale-110 transition-transform" />
               <span className="text-[9px] font-black uppercase tracking-wider">Editar</span>
            </button>
            <button onClick={() => onDelete?.(route)} className="flex-1 flex flex-col items-center justify-center gap-2 p-3 rounded-2xl hover:bg-rose-50 text-surface-400 hover:text-rose-600 transition-all border border-transparent hover:border-rose-100 group">
               <Trash2 size={20} className="group-hover:scale-110 transition-transform" />
               <span className="text-[9px] font-black uppercase tracking-wider">Borrar</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default RouteInfoPanel;
