import { useContext, useState } from 'react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { requestSearch } from '../pageContext';
import { packageStatusLabel, packageStatusVariant } from '../../../constants/status';
import { runScreenCommands } from '../screenCommands';
import { Check, CheckCircle2, FileText, ListChecks, Clock, MapPin, Package, ShieldAlert, Truck, User, X, XCircle } from 'lucide-react';
import apiService from '../../../services/apiService';
import useRole from '../../../app/useRole';
import { ChatContext } from '../useAssistantChat';
import { BOLIVIA_CITIES } from '../../../constants/bolivia';
import Badge from '../../../components/atoms/Badge';
import Button from '../../../components/atoms/Button';
import AssistantAvatar from './AssistantAvatar';
import { canGuide, useGuidedRun } from '../guided/GuidedRunProvider';
import { applyGuidedOutcome, makeOutcome } from '../guided/outcome';

/** Tarjetas con los datos estructurados que devuelven las herramientas del asistente. */

// Estado de paquete/viaje -> texto y variante del átomo Badge (la app ya tenía el componente; no se reimplementa)
// estados de VIAJE (los de paquete salen del mapa compartido, para que se vean igual que en el resto de la aplicación)
const ROUTE_STATUS_BADGE = {
  planeada: { label: 'Planeada', variant: 'info' },
  completada: { label: 'Completada', variant: 'success' },
};

// Fuera de la sesión (pruebas, vistas sueltas) no hay rol: se muestra todo y el servidor sigue siendo quien autoriza
function useRoleIfSignedIn() {
  try {
    return useRole().role;
  } catch {
    return null;
  }
}

export function StatusBadge({ status }) {
  const s = ROUTE_STATUS_BADGE[status] ?? { label: packageStatusLabel(status), variant: packageStatusVariant(status) };
  return <Badge variant={s.variant} size="lg">{s.label}</Badge>;
}

const TZ = 'America/La_Paz';

export const formatDateTime = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('es-BO', { timeZone: TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

/** "hace 5 min", "hace 3 h", "hace 2 días" */
export const timeAgo = (iso, now = Date.now()) => {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  const min = Math.max(0, Math.round((now - t) / 60000));
  if (min < 1) return 'justo ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const days = Math.round(h / 24);
  return `hace ${days} ${days === 1 ? 'día' : 'días'}`;
};

const Card = ({ children, className = '' }) => (
  <div className={`mt-3 overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-sm ${className}`}>{children}</div>
);

const Field = ({ icon: Icon, label, children }) => (
  <div className="flex items-start gap-2.5">
    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600"><Icon size={14} strokeWidth={2.4} /></span>
    <div className="min-w-0">
      <p className="text-xs font-semibold text-surface-500">{label}</p>
      <p className="text-sm font-medium text-surface-900">{children}</p>
    </div>
  </div>
);

/** Paquete: estado, ruta, llegada estimada, quién lo lleva, ubicación aproximada e historial. */
export function PackageTrackingCard({ data, canOpenTracking = true }) {
  const { package: pkg, route, location, timeline = [] } = data;
  const delivered = pkg.status === 'entregado';
  const where = location
    ? [
        location.nearest_checkpoint ? `cerca de ${location.nearest_checkpoint.name}` : null,
        location.km_to_destination != null ? `a ${location.km_to_destination} km del destino` : null,
      ].filter(Boolean).join(', ') || location.last_event
    : null;

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-100 bg-surface-50 px-4 py-3">
        <div>
          <p className="font-mono text-xs font-bold text-surface-700">{pkg.tracking_code}</p>
          <p className="mt-0.5 text-sm font-semibold text-surface-900">{pkg.origen} → {pkg.destino}</p>
        </div>
        <StatusBadge status={pkg.status} />
      </div>

      <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">
        <Field icon={Clock} label={delivered ? 'Entregado' : 'Llegada estimada'}>
          {delivered ? (formatDateTime(pkg.delivered_at) ?? 'Sí') : (formatDateTime(route?.estimated_arrival) ?? 'Aún sin estimar')}
        </Field>
        <Field icon={User} label="Conductor">{route?.driver_name ?? 'Sin asignar'}</Field>
        <Field icon={Truck} label="Vehículo">{route?.vehicle ?? '—'}</Field>
        <Field icon={MapPin} label="Ubicación">
          {delivered ? 'Entregado en destino' : where ? (
            <>
              {where}
              {location?.at && <span className="block text-xs font-normal text-surface-500">{timeAgo(location.at)}</span>}
            </>
          ) : 'Sin posición GPS todavía'}
        </Field>
      </div>

      {timeline.length > 0 && (
        <div className="border-t border-surface-100 px-4 py-3">
          <p className="mb-2 text-xs font-semibold text-surface-500">Últimos eventos</p>
          <ol className="space-y-2">
            {timeline.slice(0, 4).map((e, i) => (
              <li key={`${e.at}-${i}`} className="flex items-start gap-2.5 text-sm">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${i === 0 ? 'bg-primary-500' : 'bg-surface-300'}`} />
                <span className="min-w-0 flex-1 text-surface-800">
                  {e.status}
                  {e.note && <span className="block text-xs text-surface-500">“{e.note}”</span>}
                </span>
                <span className="shrink-0 text-xs text-surface-500">{formatDateTime(e.at)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {canOpenTracking && (
        <div className="border-t border-surface-100 px-4 py-2.5 text-right">
          <Link to="/tracking" className="text-xs font-semibold text-primary-700 hover:text-primary-800">Abrir Tracking →</Link>
        </div>
      )}
    </Card>
  );
}

/** Lista de paquetes; cada fila se puede tocar para preguntar por ese paquete. */
export function PackageListCard({ data, onAsk }) {
  const items = data.packages ?? [];
  return (
    <Card>
      <div className="border-b border-surface-100 bg-surface-50 px-4 py-3">
        <p className="text-sm font-bold text-surface-900">{data.title ?? 'Paquetes'} <span className="font-normal text-surface-500">({items.length})</span></p>
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-4 text-sm text-surface-500">No hay paquetes para mostrar.</p>
      ) : (
        <ul className="divide-y divide-surface-100">
          {items.map((p) => (
            <li key={p.tracking_code}>
              <button
                type="button"
                onClick={() => onAsk?.(`¿Dónde está el paquete ${p.tracking_code}?`)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-primary-50/50"
              >
                <Package size={16} aria-hidden="true" className="shrink-0 text-surface-500" />
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-xs font-bold text-surface-700">{p.tracking_code}</span>
                  <span className="block truncate text-sm text-surface-900">{p.origen} → {p.destino}{p.recipient_name ? ` · ${p.recipient_name}` : ''}</span>
                  {p.reason && <span className="block text-xs font-semibold text-red-600">{p.reason}</span>}
                </span>
                <StatusBadge status={p.status} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

const Kpi = ({ label, value, tone = 'text-surface-900' }) => (
  <div className="rounded-xl border border-surface-100 bg-surface-50 px-3 py-3">
    <p className="text-xs font-semibold text-surface-500">{label}</p>
    <p className={`mt-1 text-2xl font-bold tracking-tight ${tone}`}>{value ?? 0}</p>
  </div>
);

/** Resumen de la operación del día. */
export function OperationsSummaryCard({ data }) {
  return (
    <Card>
      <div className="border-b border-surface-100 bg-surface-50 px-4 py-3"><p className="text-sm font-bold text-surface-900">Operación de hoy</p></div>
      <div className="grid grid-cols-2 gap-2.5 p-4 sm:grid-cols-4">
        <Kpi label="En tránsito" value={data.in_transit} />
        <Kpi label="Pendientes" value={data.pending} />
        <Kpi label="Retrasados" value={data.delayed} tone={data.delayed > 0 ? 'text-amber-600' : undefined} />
        <Kpi label="Siniestros" value={data.incidents} tone={data.incidents > 0 ? 'text-red-600' : undefined} />
        <Kpi label="En agencia" value={data.at_agency} />
        <Kpi label="Rutas activas" value={data.active_routes} />
        <Kpi label="Vehículos" value={data.vehicles} />
        <Kpi label="Tasa de entrega" value={data.delivery_rate_pct != null ? `${data.delivery_rate_pct}%` : '—'} />
      </div>
    </Card>
  );
}

/** Agenda del conductor: sus rutas con los paquetes a entregar. */
export function DriverAgendaCard({ data, onAsk }) {
  const routes = data.routes ?? [];
  return (
    <Card>
      <div className="border-b border-surface-100 bg-surface-50 px-4 py-3"><p className="text-sm font-bold text-surface-900">Tu agenda <span className="font-normal text-surface-500">({routes.length})</span></p></div>
      {routes.length === 0 ? <p className="px-4 py-4 text-sm text-surface-500">No tienes rutas planeadas ni en curso.</p> : (
        <ul className="divide-y divide-surface-100">
          {routes.map((r, i) => (
            <li key={`${r.route_code}-${i}`} className="px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-surface-900">{r.origin} → {r.destination}</p>
                <StatusBadge status={r.status} />
              </div>
              <p className="mt-0.5 text-xs text-surface-500">Salida: {formatDateTime(r.departure_time) ?? '—'}{r.estimated_arrival ? ` · Llegada estimada: ${formatDateTime(r.estimated_arrival)}` : ''}</p>
              {(r.packages ?? []).length > 0 && (
                <ul className="mt-2 space-y-1">
                  {r.packages.map((p) => (
                    <li key={p.tracking_code}>
                      <button type="button" onClick={() => onAsk?.(`¿Dónde está el paquete ${p.tracking_code}?`)} className="flex w-full items-center justify-between gap-2 rounded-lg bg-surface-50 px-3 py-2 text-left text-sm hover:bg-primary-50/60">
                        <span className="min-w-0 truncate"><span className="font-mono text-xs font-bold text-surface-700">{p.tracking_code}</span> · {p.destino}{p.recipient_name ? ` · ${p.recipient_name}` : ''}</span>
                        <StatusBadge status={p.status} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Flota: vehículos y conductores. */
export function FleetCard({ data }) {
  const vehicles = data.vehicles ?? [];
  const drivers = data.drivers ?? [];
  return (
    <Card>
      <div className="border-b border-surface-100 bg-surface-50 px-4 py-3"><p className="text-sm font-bold text-surface-900">Flota <span className="font-normal text-surface-500">({vehicles.length} vehículos · {drivers.length} conductores)</span></p></div>
      <ul className="divide-y divide-surface-100">
        {vehicles.map((v) => (
          <li key={v.plate} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <span className="min-w-0 truncate"><span className="font-mono text-xs font-bold text-surface-700">{v.plate}</span> · {[v.brand, v.model].filter(Boolean).join(' ')}{v.capacity_kg ? ` · ${Number(v.capacity_kg).toLocaleString('es-BO')} kg` : ''}</span>
            <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-surface-500">{v.status ?? '—'}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/**
 * Acción propuesta por el asistente. El asistente NO la ejecuta: solo se hace cuando el usuario pulsa "Confirmar",
 * que llama al servidor con su sesión. El resumen lo redacta el servidor, no el modelo.
 */
export function ActionProposalCard({ data }) {
  const action = data.action;
  const role = useRoleIfSignedIn();
  const chat = useContext(ChatContext); // avisa al botón flotante de que ya no hay nada por confirmar
  const guided = useGuidedRun(); // «Que Logi lo haga»: null fuera del layout
  // si la acción ya se resolvió (p. ej. Logi la hizo con el panel cerrado), la tarjeta nace con su resultado
  const [state, setState] = useState(() => chat?.actionOutcomes?.get(action.id) ?? { status: 'pending' }); // pending | working | done | cancelled | error
  const canOpenPackage = role !== 'driver'; // el conductor no tiene la ficha de paquete

  const call = async (verb) => {
    setState({ status: 'working', verb });
    try {
      const res = await apiService.post(`/ai-agent/actions/${action.id}/${verb}`);
      const outcome = verb === 'confirm' ? makeOutcome(action, res) : { status: 'cancelled', type: action.type, title: action.title, at: Date.now(), message: res?.result?.message };
      chat?.settleAction?.(action.id, outcome);
      setState(outcome);
      if (verb === 'confirm' && res?.result?.data?.reveal) runScreenCommands([res.result.data.reveal]); // deja a la vista lo que se acaba de hacer
      // el detalle ya se ve en la tarjeta: el aviso solo nombra la acción
      if (verb === 'confirm') toast.success('Acción ejecutada', { description: action.title });
      else toast('Acción cancelada', { description: action.title });
    } catch (err) {
      setState({ status: 'error', message: err?.message || 'No se pudo completar la acción.' });
      toast.error('No se pudo completar la acción', { description: err?.message });
    }
  };

  // Logi hace la acción a la vista de todos; al terminar, queda igual que si se hubiera pulsado «Confirmar»
  const callGuided = async () => {
    setState({ status: 'working', verb: 'confirm' });
    const out = await guided.start(action);
    setState(applyGuidedOutcome({ out, action, chat }) ?? { status: 'pending' });
  };

  // «Enséñame»: Logi lo hace a la vista de todos pero SIN guardar nada; la acción sigue pendiente
  const callDemo = async () => {
    setState({ status: 'working', verb: 'demo' });
    const out = await guided.start(action, { demo: true });
    applyGuidedOutcome({ out, action, chat });
    setState({ status: 'pending' });
  };

  const working = state.status === 'working';
  const finished = state.status === 'done' || state.status === 'cancelled';
  const tone = state.status === 'done' ? 'border-emerald-300' : state.status === 'cancelled' ? 'border-surface-200' : state.status === 'error' ? 'border-red-300' : 'border-amber-300';

  return (
    <Card className={`!border-2 ${tone}`}>
      <div className="flex items-center gap-2 border-b border-surface-100 bg-surface-50 px-4 py-3">
        {state.status === 'done' ? <CheckCircle2 size={16} className="text-emerald-600" /> : state.status === 'cancelled' ? <XCircle size={16} className="text-surface-500" /> : <ShieldAlert size={16} className="text-amber-600" />}
        <p className="text-sm font-bold text-surface-900">{action.title}</p>
        <span className="ml-auto text-xs font-semibold text-surface-500">
          {state.status === 'done' ? 'Hecho' : state.status === 'cancelled' ? 'Cancelada' : 'Requiere tu confirmación'}
        </span>
      </div>

      <ul className="space-y-1.5 px-4 py-3 text-sm text-surface-800">
        {action.lines.map((line) => <li key={line}>{line}</li>)}
      </ul>

      {state.status === 'done' && (
        <div role="status" className="border-t border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <p className="flex items-start gap-2 font-semibold"><CheckCircle2 size={16} aria-hidden="true" className="mt-0.5 shrink-0" /><span>{state.message}</span></p>
          {(state.results?.length ?? 0) > 1 && (
            <ul aria-label="Resultado por paquete" className="mt-2 space-y-1 text-xs">
              {state.results.map((r) => (
                <li key={r.tracking_code} className={`flex items-center gap-1.5 ${r.ok ? 'text-emerald-800' : 'font-semibold text-red-700'}`}>
                  {r.ok ? <Check size={14} aria-hidden="true" /> : <X size={14} aria-hidden="true" />}
                  <span className="sr-only">{r.ok ? 'Hecho: ' : 'Falló: '}</span>
                  <span className="font-mono">{r.tracking_code}</span>{r.ok ? '' : <span> — {r.error}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {state.status === 'done' && (state.records?.length ?? 0) > 0 && (
        <div className="border-t border-surface-100 px-4 py-3">
          <p className="text-xs font-semibold text-surface-700">Comprobado en el sistema ahora mismo</p>
          <ul aria-label="Estado real de los paquetes" className="mt-2 divide-y divide-surface-100">
            {state.records.map((rec) => (
              <li key={rec.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="min-w-0 text-sm">
                  <p className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-bold text-surface-800">{rec.tracking_code}</span><StatusBadge status={rec.status} /></p>
                  <p className="mt-1 text-xs text-surface-600">{rec.origen} → {rec.destino}{rec.peso != null ? ` · ${Number(rec.peso).toLocaleString('es-BO')} kg` : ''}{rec.recipient_name ? ` · ${rec.recipient_name}` : ''}{rec.trip ? ` · Viaje ${rec.trip}` : ''}</p>
                </div>
                {canOpenPackage && (
                  <Link to={`/logistics/packages/${rec.id}`} className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-primary-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500">
                    Ver paquete{' '}<span className="sr-only">{rec.tracking_code}</span><span aria-hidden="true"> →</span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
          {canOpenPackage && (
            // «¿dónde quedó?»: lleva a la tabla de Paquetes ya filtrada por lo que se acaba de hacer (si fue un solo paquete)
            <Link
              to="/logistics/packages"
              onClick={() => requestSearch('packages', state.records.length === 1 ? state.records[0].tracking_code : '')}
              className="mt-1 inline-flex min-h-11 items-center rounded-lg bg-primary-50 px-3 text-sm font-semibold text-primary-700 hover:bg-primary-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
            >
              {state.records.length === 1 ? 'Ver en la tabla de Paquetes' : 'Ver en Paquetes'}
            </Link>
          )}
        </div>
      )}
      {state.status === 'cancelled' && <p role="status" className="border-t border-surface-100 bg-surface-50 px-4 py-3 text-sm text-surface-600">{state.message ?? 'Acción cancelada. No se hizo ningún cambio.'}</p>}
      {state.status === 'error' && <p role="alert" className="border-t border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{state.message}</p>}

      {!finished && state.status !== 'error' && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-surface-100 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs text-surface-500">Nada se ha hecho todavía. Revisa los datos antes de confirmar.</p>
            {guided && canGuide(action) && (
              <button
                type="button"
                onClick={callDemo}
                disabled={working}
                className="mt-1 inline-flex min-h-11 items-center text-xs font-semibold text-primary-700 underline hover:text-primary-800 disabled:opacity-50"
                title="Logi te muestra cómo se hace, paso a paso, sin guardar nada"
              >
                Solo enséñame cómo, sin guardar
              </button>
            )}
          </div>
          <div className="flex min-w-0 flex-wrap gap-2">
            <Button variant="secondary" onClick={() => call('cancel')} disabled={working} className="min-h-11 flex-1 sm:flex-none">Cancelar</Button>
            {guided && canGuide(action) && (
              <Button variant="secondary" onClick={callGuided} disabled={working} className="min-h-11 flex-1 gap-2 sm:flex-none" title="Logi va a la pantalla y lo hace paso a paso">
                <AssistantAvatar size={22} mood="idle" /> Que Logi lo haga
              </Button>
            )}
            <Button onClick={() => call('confirm')} disabled={working} className="min-h-11 flex-1 sm:flex-none">
              {working && state.verb === 'confirm' ? 'Ejecutando…' : 'Confirmar'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

const kgText = (n) => (n == null ? 'capacidad sin registrar' : `${Number(n).toLocaleString('es-BO')} kg`);

function TripRow({ trip, canSchedule, onAsk, weightKg }) {
  const fits = trip.fits;
  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-surface-900">{trip.origin} → {trip.destination}</p>
        <span className={`rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${fits === false ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {fits === false ? 'No cabe' : trip.free_kg != null ? `${Number(trip.free_kg).toLocaleString('es-BO')} kg libres` : 'Con cupo'}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-surface-500">
        Sale {formatDateTime(trip.departure_time) ?? '—'}{trip.estimated_arrival ? ` · llega ${formatDateTime(trip.estimated_arrival)}` : ''}
        {trip.vehicle ? ` · ${trip.vehicle}` : ''}{trip.capacity_kg != null ? ` (${kgText(trip.capacity_kg)})` : ''}
      </p>
      {canSchedule && fits !== false && (
        <button
          type="button"
          onClick={() => onAsk?.(`Quiero agendar un paquete${weightKg ? ` de ${weightKg} kg` : ''} en el viaje ${trip.ref}`)}
          className="mt-2 min-h-11 rounded-lg border border-primary-200 bg-primary-50 px-4 text-sm font-bold text-primary-700 hover:bg-primary-100"
        >
          Agendar un paquete aquí
        </button>
      )}
    </li>
  );
}

/** Viajes disponibles en una fecha y horario, con el espacio que queda; alternativas si no hay ninguno. */
export function AvailableTripsCard({ data, onAsk }) {
  const { trips = [], alternatives = [], query = {}, can_schedule: canSchedule } = data;
  const when = [query.date, query.from_time && query.to_time ? `${query.from_time}–${query.to_time}` : null].filter(Boolean).join(' · ');
  return (
    <Card>
      <div className="border-b border-surface-100 bg-surface-50 px-4 py-3">
        <p className="text-sm font-bold text-surface-900">Viajes disponibles{query.destination ? ` a ${query.destination}` : ''}{query.origin ? ` desde ${query.origin}` : ''}</p>
        {when && <p className="mt-0.5 text-xs text-surface-500">{when}</p>}
      </div>
      {trips.length > 0 && <ul className="divide-y divide-surface-100">{trips.map((t) => <TripRow key={t.ref} trip={t} canSchedule={canSchedule} onAsk={onAsk} weightKg={query.weight_kg} />)}</ul>}
      {trips.length === 0 && (
        <>
          <p className="px-4 py-3 text-sm text-surface-600">No hay viajes en ese horario.</p>
          {alternatives.length > 0 && (
            <>
              <p className="border-t border-surface-100 px-4 pt-3 text-xs font-semibold text-surface-500">Los más cercanos</p>
              <ul className="divide-y divide-surface-100">{alternatives.map((t) => <TripRow key={t.ref} trip={t} canSchedule={canSchedule} onAsk={onAsk} weightKg={query.weight_kg} />)}</ul>
            </>
          )}
        </>
      )}
    </Card>
  );
}

/** Vehículos y conductores libres u ocupados en una fecha y horario (solo personal). */
export function FleetAvailabilityCard({ data }) {
  const { window: w = {}, vehicles_free: vf = [], vehicles_busy: vb = [], drivers_free: df = [], drivers_busy: db = [] } = data;
  const Col = ({ title, items, tone, label }) => (
    <div>
      <p className={`text-xs font-semibold ${tone}`}>{title} ({items.length})</p>
      {items.length === 0 ? <p className="mt-1 text-sm text-surface-500">—</p> : <ul className="mt-1 space-y-1">{items.map((i) => <li key={label(i)} className="text-sm text-surface-800">{label(i)}</li>)}</ul>}
    </div>
  );
  return (
    <Card>
      <div className="border-b border-surface-100 bg-surface-50 px-4 py-3">
        <p className="text-sm font-bold text-surface-900">Flota en ese horario</p>
        <p className="mt-0.5 text-xs text-surface-500">{[w.date, w.from_time && w.to_time ? `${w.from_time}–${w.to_time}` : null].filter(Boolean).join(' · ')}</p>
      </div>
      <div className="grid gap-4 px-4 py-4 sm:grid-cols-2">
        <Col title="Vehículos libres" items={vf} tone="text-emerald-700" label={(v) => v.vehicle || v.plate} />
        <Col title="Vehículos ocupados" items={vb} tone="text-amber-700" label={(v) => v.vehicle || v.plate} />
        <Col title="Conductores libres" items={df} tone="text-emerald-700" label={(d) => d.name} />
        <Col title="Conductores ocupados" items={db} tone="text-amber-700" label={(d) => d.name} />
      </div>
    </Card>
  );
}

/** Resumen del día para el personal: prioridades ya ordenadas, qué atender, pendientes sin viaje y salidas de hoy. */
export function DailyBriefingCard({ data, onAsk }) {
  const k = data.kpis ?? {};
  const attention = data.attention ?? [];
  const unassigned = data.unassigned ?? { count: 0, oldest: [] };
  const departures = data.departures_today ?? [];
  return (
    <Card>
      <div className="border-b border-surface-100 bg-surface-50 px-4 py-3">
        <p className="text-sm font-bold text-surface-900">Resumen del día</p>
        {data.date && <p className="mt-0.5 text-xs text-surface-500">{data.date}</p>}
      </div>

      <div className="px-4 pt-3">
        <p className="text-xs font-semibold text-surface-500">Prioridades</p>
        <ol className="mt-1.5 space-y-1">
          {(data.priorities ?? []).map((p, i) => (
            <li key={p} className="flex gap-2 text-sm text-surface-900">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary-700">{i + 1}</span>
              {p}
            </li>
          ))}
        </ol>
      </div>

      <div className="grid grid-cols-2 gap-2.5 p-4 sm:grid-cols-4">
        <Kpi label="En tránsito" value={k.in_transit} />
        <Kpi label="Pendientes" value={k.pending} />
        <Kpi label="Retrasados" value={k.delayed} tone={k.delayed > 0 ? 'text-amber-600' : undefined} />
        <Kpi label="Siniestros" value={k.incidents} tone={k.incidents > 0 ? 'text-red-600' : undefined} />
      </div>

      {attention.length > 0 && (
        <div className="border-t border-surface-100">
          <p className="px-4 pt-3 text-xs font-semibold text-surface-500">Requieren atención</p>
          <ul className="divide-y divide-surface-100">
            {attention.map((a) => (
              <li key={`${a.tracking_code}-${a.reason}`}>
                <button type="button" onClick={() => onAsk?.(`¿Dónde está el paquete ${a.tracking_code}?`)} className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-primary-50/50">
                  <span className="min-w-0"><span className="block font-mono text-xs font-bold text-surface-700">{a.tracking_code}</span><span className="block truncate text-sm text-surface-900">{a.route}</span></span>
                  <span className="shrink-0 text-xs font-semibold text-red-600">{a.reason}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {unassigned.count > 0 && (
        <div className="border-t border-surface-100 px-4 py-3">
          <p className="text-sm text-surface-900"><span className="font-bold">{unassigned.count}</span> {unassigned.count === 1 ? 'paquete pendiente sin viaje' : 'paquetes pendientes sin viaje'}</p>
          <ul className="mt-1 space-y-0.5 text-xs text-surface-500">
            {(unassigned.oldest ?? []).map((p) => <li key={p.tracking_code}><span className="font-mono">{p.tracking_code}</span> · {p.route}{p.peso ? ` · ${p.peso} kg` : ''}</li>)}
          </ul>
        </div>
      )}

      {departures.length > 0 && (
        <div className="border-t border-surface-100 px-4 py-3">
          <p className="text-xs font-semibold text-surface-500">Salen hoy</p>
          <ul className="mt-1 space-y-0.5 text-sm text-surface-900">
            {departures.map((d, i) => <li key={`${d.departure_time}-${i}`}>{d.origin} → {d.destination} · {formatDateTime(d.departure_time)}</li>)}
          </ul>
        </div>
      )}
    </Card>
  );
}

const durationText = (hours) => (hours == null ? '—' : hours < 1 ? `${Math.round(hours * 60)} min` : `${hours} h`);

/** Analítica de un período para el personal. */
export function AnalyticsSummaryCard({ data }) {
  const t = data.totals ?? {};
  const change = t.change;
  return (
    <Card>
      <div className="border-b border-surface-100 bg-surface-50 px-4 py-3">
        <p className="text-sm font-bold text-surface-900">Analítica del período</p>
        {data.range && <p className="mt-0.5 text-xs text-surface-500">{data.range.from} → {data.range.to} ({data.range.days} días)</p>}
      </div>
      <div className="grid grid-cols-2 gap-2.5 p-4 sm:grid-cols-4">
        <Kpi label="Envíos" value={t.shipments} />
        <Kpi label="Variación" value={change == null ? '—' : `${change > 0 ? '+' : ''}${change}%`} tone={change == null ? 'text-surface-500' : change >= 0 ? 'text-emerald-700' : 'text-red-600'} />
        <Kpi label="A tiempo" value={t.onTimePct == null ? '—' : `${t.onTimePct}%`} />
        <Kpi label="Entrega prom." value={durationText(t.avgDeliveryHours)} />
      </div>
      {(data.top_drivers ?? []).length > 0 && (
        <div className="border-t border-surface-100 px-4 py-3">
          <p className="text-xs font-semibold text-surface-500">Conductores</p>
          <ul className="mt-1 space-y-0.5 text-sm text-surface-900">
            {data.top_drivers.map((d) => <li key={d.name}>{d.name} · {d.deliveries} {d.deliveries === 1 ? 'entrega' : 'entregas'}{d.efficiency_pct != null ? ` · ${d.efficiency_pct}% a tiempo` : ''}</li>)}
          </ul>
        </div>
      )}
      {(data.busiest_days ?? []).length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-surface-100 px-4 py-3">
          <span className="text-xs font-semibold text-surface-500">Más movimiento</span>
          {data.busiest_days.map((d) => <span key={d.date} className="rounded-full border border-surface-200 bg-surface-50 px-2.5 py-1 text-xs text-surface-700">{d.date}: {d.packages}</span>)}
        </div>
      )}
    </Card>
  );
}

/** Elige la tarjeta según el tipo de dato. */
const FIELD_LABELS = { origen: 'Origen', destino: 'Destino', peso: 'Peso (kg)', recipient_name: 'Destinatario' };
const inputClass = (bad) => `min-h-11 w-full rounded-xl border bg-white px-3 text-sm text-surface-900 outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 disabled:bg-surface-50 disabled:text-surface-600 ${bad ? 'border-red-300' : 'border-surface-200'}`;

// A nivel de módulo a propósito: definido dentro de la tarjeta se recrearía en cada tecla y el campo perdería el foco.
function DocField({ listId, id, label, required, children }) {
  return (
    <div className="min-w-0">
      <label htmlFor={`${listId}-${id}`} className="text-xs font-semibold text-surface-700">{label}{required && <span aria-hidden="true" className="text-danger"> *</span>}</label>
      {children}
    </div>
  );
}

/**
 * Datos leídos de la foto de una guía de remisión. La IA solo leyó: aquí la persona revisa y corrige, y recién entonces
 * se prepara el registro (que se confirma con el botón de siempre). Lo que no se leyó queda marcado para completarlo.
 */
export function DocumentExtractionCard({ data }) {
  const f = data.fields ?? {};
  const [form, setForm] = useState({
    origen: f.origen ?? '',
    destino: f.destino ?? '',
    peso: f.peso_kg ?? '',
    recipient_name: f.recipient_name ?? '',
    recipient_phone: f.recipient_phone ?? '',
    sender_name: f.sender_name ?? '',
    sender_phone: f.sender_phone ?? '',
    description: f.description ?? '',
  });
  const [state, setState] = useState({ status: 'editing' }); // editing | working | ready | error
  const listId = `ciudades-${data.fields?.document_number ?? 'doc'}`;

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));
  const weight = Number(String(form.peso).replace(',', '.'));
  const problems = {
    origen: form.origen.trim().length < 3,
    destino: form.destino.trim().length < 3,
    peso: !(weight > 0),
    recipient_name: form.recipient_name.trim().length < 3,
  };
  const missing = Object.keys(problems).filter((k) => problems[k]);
  const locked = state.status === 'working' || state.status === 'ready';

  const prepare = async () => {
    setState({ status: 'working' });
    try {
      const body = { origen: form.origen.trim(), destino: form.destino.trim(), peso: weight, recipient_name: form.recipient_name.trim() };
      for (const k of ['recipient_phone', 'sender_name', 'sender_phone', 'description']) if (form[k].trim()) body[k] = form[k].trim();
      const res = await apiService.proposeFromDocument(body);
      setState({ status: 'ready', proposal: res.data });
    } catch (err) {
      setState({ status: 'error', message: err?.message || 'No se pudo preparar el registro.' });
    }
  };

  return (
    <Card>
      <div className="border-b border-surface-100 bg-surface-50 px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-bold text-surface-900"><FileText size={16} aria-hidden="true" className="text-primary-600" /> Datos leídos de la guía{f.document_number ? ` N° ${f.document_number}` : ''}</p>
        <p className="mt-0.5 text-xs text-surface-600">La IA solo leyó la foto. Revisa y corrige los datos; la foto no se guarda.</p>
      </div>

      {(data.warnings ?? []).length > 0 && (
        <ul className="space-y-1 border-b border-amber-100 bg-amber-50 px-4 py-3" aria-label="Avisos de la lectura">
          {data.warnings.map((w) => <li key={w} className="flex gap-2 text-sm text-amber-900"><ShieldAlert size={15} aria-hidden="true" className="mt-0.5 shrink-0" />{w}</li>)}
        </ul>
      )}

      <fieldset disabled={locked} className="grid gap-3 p-4 sm:grid-cols-2">
        <legend className="sr-only">Datos del paquete</legend>
        <DocField listId={listId} id="origen" label="Origen" required>
          <input id={`${listId}-origen`} list={`${listId}-cities`} value={form.origen} onChange={set('origen')} aria-invalid={problems.origen} className={inputClass(problems.origen)} autoComplete="off" />
        </DocField>
        <DocField listId={listId} id="destino" label="Destino" required>
          <input id={`${listId}-destino`} list={`${listId}-cities`} value={form.destino} onChange={set('destino')} aria-invalid={problems.destino} className={inputClass(problems.destino)} autoComplete="off" />
        </DocField>
        <datalist id={`${listId}-cities`}>{BOLIVIA_CITIES.map((c) => <option key={c.key} value={c.name} />)}</datalist>
        <DocField listId={listId} id="peso" label="Peso (kg)" required>
          <input id={`${listId}-peso`} type="number" inputMode="decimal" step="0.1" min="0" value={form.peso} onChange={set('peso')} aria-invalid={problems.peso} className={inputClass(problems.peso)} />
        </DocField>
        <DocField listId={listId} id="recipient_name" label="Destinatario" required>
          <input id={`${listId}-recipient_name`} value={form.recipient_name} onChange={set('recipient_name')} aria-invalid={problems.recipient_name} className={inputClass(problems.recipient_name)} autoComplete="off" />
        </DocField>
        <DocField listId={listId} id="recipient_phone" label="Teléfono del destinatario"><input id={`${listId}-recipient_phone`} inputMode="tel" value={form.recipient_phone} onChange={set('recipient_phone')} className={inputClass(false)} /></DocField>
        <DocField listId={listId} id="sender_name" label="Remitente"><input id={`${listId}-sender_name`} value={form.sender_name} onChange={set('sender_name')} className={inputClass(false)} autoComplete="off" /></DocField>
        <DocField listId={listId} id="sender_phone" label="Teléfono del remitente"><input id={`${listId}-sender_phone`} inputMode="tel" value={form.sender_phone} onChange={set('sender_phone')} className={inputClass(false)} /></DocField>
        <DocField listId={listId} id="description" label="Contenido"><input id={`${listId}-description`} value={form.description} onChange={set('description')} className={inputClass(false)} autoComplete="off" /></DocField>
      </fieldset>

      {state.status !== 'ready' && (
        <div className="border-t border-surface-100 px-4 py-3">
          <button type="button" onClick={prepare} disabled={missing.length > 0 || state.status === 'working'} className="min-h-11 rounded-xl bg-brand-gradient px-5 text-sm font-bold text-white shadow-sm disabled:opacity-50">
            {state.status === 'working' ? 'Preparando…' : 'Preparar registro'}
          </button>
          {missing.length > 0 && <p className="mt-2 text-xs text-surface-600">Falta completar: {missing.map((k) => FIELD_LABELS[k].toLowerCase()).join(', ')}.</p>}
          {state.status === 'error' && <p role="alert" className="mt-2 text-sm text-red-700">{state.message}</p>}
        </div>
      )}
      {state.status === 'ready' && <div className="border-t border-surface-100 p-3"><ActionProposalCard data={state.proposal} /></div>}
    </Card>
  );
}

const MAX_PREPARED_AT_ONCE = 5; // el servidor guarda como máximo 5 propuestas pendientes por usuario

/**
 * Sugerencias de asignación: a qué viaje enviar cada paquete suelto. Es solo una sugerencia: el botón convierte un
 * grupo en una propuesta (sin llamar al modelo) y esa propuesta se confirma con el botón de siempre.
 */
export function AssignmentSuggestionsCard({ data }) {
  const groups = data.groups ?? [];
  const unassigned = data.unassigned ?? [];
  const [prepared, setPrepared] = useState({}); // índice del grupo -> { status: 'working' | 'ready' | 'error', proposal?, message? }

  const prepare = async (index) => {
    const g = groups[index];
    setPrepared((p) => ({ ...p, [index]: { status: 'working' } }));
    try {
      const res = await apiService.prepareAssignment({ route_ref: g.route_ref, codes: g.packages.map((x) => x.tracking_code) });
      setPrepared((p) => ({ ...p, [index]: { status: 'ready', proposal: res.data } }));
    } catch (err) {
      setPrepared((p) => ({ ...p, [index]: { status: 'error', message: err?.message || 'No se pudo preparar la asignación.' } }));
    }
  };

  const pending = groups.map((_, i) => i).filter((i) => !prepared[i] || prepared[i].status === 'error');
  const prepareAll = async () => {
    for (const i of pending.slice(0, MAX_PREPARED_AT_ONCE)) {
      // en serie: así el servidor cuenta bien las propuestas pendientes
      // eslint-disable-next-line no-await-in-loop
      await prepare(i);
    }
  };

  if (data.total_loose === 0) {
    return (
      <Card>
        <div className="px-4 py-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-surface-900"><CheckCircle2 size={16} aria-hidden="true" className="text-emerald-600" /> No hay paquetes sueltos</p>
          <p className="mt-1 text-sm text-surface-600">Todos los paquetes registrados ya tienen viaje.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="border-b border-surface-100 bg-surface-50 px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-bold text-surface-900"><ListChecks size={16} aria-hidden="true" className="text-primary-600" /> Sugerencia de asignación</p>
        <p className="mt-0.5 text-xs text-surface-600">
          {data.assignable} de {data.total_loose} paquetes sueltos se pueden asignar. No se ha asignado nada todavía.
        </p>
      </div>

      <ul className="divide-y divide-surface-100">
        {groups.map((g, i) => {
          const st = prepared[i];
          return (
            <li key={`${g.route_ref}-${i}`} className="px-4 py-3">
              <p className="text-sm font-semibold text-surface-900">{g.origin} → {g.destination}</p>
              <p className="text-xs text-surface-600">
                Sale {formatDateTime(g.departure_time)}
                {g.vehicle ? ` · ${g.vehicle}` : ''}
                {g.capacity_unknown ? ' · sin dato de capacidad' : ` · quedan ${g.remaining_kg} kg libres`}
              </p>
              <ul className="mt-2 space-y-1">
                {g.packages.map((p) => (
                  <li key={p.tracking_code} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate"><span className="font-mono text-xs font-semibold text-surface-900">{p.tracking_code}</span>{p.recipient_name ? <span className="text-surface-600"> · {p.recipient_name}</span> : null}</span>
                    <span className="shrink-0 text-surface-600">{p.peso} kg</span>
                  </li>
                ))}
              </ul>

              {(!st || st.status === 'error') && (
                <button type="button" onClick={() => prepare(i)} className="mt-3 min-h-11 rounded-xl border border-primary-200 bg-primary-50 px-4 text-sm font-bold text-primary-700 hover:bg-primary-100">
                  Preparar asignación ({g.packages.length} {g.packages.length === 1 ? 'paquete' : 'paquetes'}, {g.total_kg} kg)
                </button>
              )}
              {st?.status === 'working' && <p role="status" className="mt-3 text-sm text-surface-600">Preparando…</p>}
              {st?.status === 'error' && <p role="alert" className="mt-2 text-sm text-red-700">{st.message}</p>}
              {st?.status === 'ready' && <div className="mt-3"><ActionProposalCard data={st.proposal} /></div>}
            </li>
          );
        })}
      </ul>

      {groups.length > 1 && pending.length > 1 && (
        <div className="border-t border-surface-100 px-4 py-3">
          <button type="button" onClick={prepareAll} className="min-h-11 rounded-xl bg-brand-gradient px-5 text-sm font-bold text-white shadow-sm">
            Preparar {Math.min(pending.length, MAX_PREPARED_AT_ONCE)} asignaciones
          </button>
          {pending.length > MAX_PREPARED_AT_ONCE && <p className="mt-2 text-xs text-surface-600">Máximo {MAX_PREPARED_AT_ONCE} a la vez; el resto, después.</p>}
        </div>
      )}

      {unassigned.length > 0 && (
        <div className="border-t border-surface-100 bg-amber-50/50 px-4 py-3">
          <p className="text-sm font-semibold text-surface-900">Sin viaje por ahora ({unassigned.length})</p>
          <ul className="mt-1.5 space-y-1">
            {unassigned.map((u) => (
              <li key={u.tracking_code} className="text-sm text-surface-700"><span className="font-mono text-xs font-semibold">{u.tracking_code}</span> — {u.reason}</li>
            ))}
          </ul>
          <Link to="/logistics/routes" className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-primary-700 hover:underline">Revisar o crear viajes →</Link>
        </div>
      )}
    </Card>
  );
}

export function AttachmentCard({ attachment, onAsk, role }) {
  switch (attachment?.kind) {
    case 'package_tracking': return <PackageTrackingCard data={attachment} canOpenTracking={role !== 'driver'} />;
    case 'package_list': return <PackageListCard data={attachment} onAsk={onAsk} />;
    case 'operations_summary': return <OperationsSummaryCard data={attachment} />;
    case 'driver_agenda': return <DriverAgendaCard data={attachment} onAsk={onAsk} />;
    case 'fleet_status': return <FleetCard data={attachment} />;
    case 'action_proposal': return <ActionProposalCard data={attachment} />;
    case 'available_trips': return <AvailableTripsCard data={attachment} onAsk={onAsk} />;
    case 'fleet_availability': return <FleetAvailabilityCard data={attachment} />;
    case 'daily_briefing': return <DailyBriefingCard data={attachment} onAsk={onAsk} />;
    case 'analytics_summary': return <AnalyticsSummaryCard data={attachment} />;
    case 'assignment_suggestions': return <AssignmentSuggestionsCard data={attachment} />;
    case 'document_extraction': return <DocumentExtractionCard data={attachment} />;
    default: return null;
  }
}
