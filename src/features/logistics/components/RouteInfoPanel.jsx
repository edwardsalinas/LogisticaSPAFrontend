import { Clock3, MapPinned, Phone, Route, X } from 'lucide-react';
import Button from '../../../components/atoms/Button';

function RouteInfoPanel({ route, onClose }) {
  if (!route) return null;

  return (
    <div className="route-info-panel absolute right-4 top-4 z-[1000] w-[21rem] overflow-hidden rounded-[1.5rem] shadow-xl">
      <div className="bg-[linear-gradient(135deg,#0b4ea2_0%,#137fec_100%)] p-5 text-white">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[0.62rem] uppercase tracking-[0.2em] text-sky-100/70">Ruta activa</p>
            <h3 className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em]">{route.route_code || `RT-${route.id?.substring(0, 6).toUpperCase()}`}</h3>
          </div>
          <button onClick={onClose} className="rounded-xl bg-white/10 p-2 text-white/80 transition-colors hover:bg-white/16 hover:text-white">
            <X size={18} strokeWidth={2.2} />
          </button>
        </div>
        <p className="text-sm text-primary-50">{route.origin}{' -> '}{route.destination}</p>
      </div>

      <div className="space-y-5 p-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[1.2rem] border border-surface-100 bg-surface-50 p-4">
            <p className="text-[0.62rem] uppercase tracking-[0.18em] text-surface-500">Progreso</p>
            <p className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em] text-surface-950">{route.progress || 65}%</p>
          </div>
          <div className="rounded-[1.2rem] border border-surface-100 bg-surface-50 p-4">
            <p className="text-[0.62rem] uppercase tracking-[0.18em] text-surface-500">Restante</p>
            <p className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em] text-surface-950">{route.remaining_distance || '45.2'} km</p>
          </div>
        </div>

        <div className="rounded-[1.2rem] border border-surface-100 bg-surface-50 p-4">
          <p className="mb-3 text-[0.62rem] uppercase tracking-[0.18em] text-surface-500">Siguiente parada</p>
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-100 text-primary-700">
              <MapPinned size={18} strokeWidth={2.1} />
            </div>
            <div>
              <p className="text-sm font-semibold text-surface-900">{route.next_checkpoint || 'Centro logistico norte'}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-surface-500"><Clock3 size={13} strokeWidth={2.2} /> ETA {route.eta || '14:30'} ({route.eta_minutes || '25'} min)</p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.2rem] border border-surface-100 bg-surface-50 p-4">
          <p className="mb-3 text-[0.62rem] uppercase tracking-[0.18em] text-surface-500">Conductor asignado</p>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">{(route.driver_name || 'C').charAt(0)}</div>
            <div>
              <p className="text-sm font-semibold text-surface-900">{route.driver_name || 'Juan Perez'}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-surface-500"><Phone size={13} strokeWidth={2.2} /> {route.driver_phone || '+591 70012345'}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="primary" size="sm" className="flex-1" onClick={() => window.open(`/logistics/routes/${route.id}/map`, '_blank')}>
            <Route size={15} strokeWidth={2.2} />
            Ver mapa
          </Button>
          <Button variant="secondary" size="sm" className="flex-1" onClick={() => window.open(`tel:${route.driver_phone || ''}`, '_self')}>
            <Phone size={15} strokeWidth={2.2} />
            Contactar
          </Button>
        </div>
      </div>
    </div>
  );
}

export default RouteInfoPanel;
