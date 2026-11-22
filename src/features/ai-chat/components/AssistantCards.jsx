import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, CheckCircle2, Clock, MapPin, Package, ShieldAlert, Truck, User, X, XCircle } from 'lucide-react';
import apiService from '../../../services/apiService';
import Badge from '../../../components/atoms/Badge';
import Button from '../../../components/atoms/Button';

/** Tarjetas con los datos estructurados que devuelven las herramientas del asistente. */

// Estado de paquete/viaje -> texto y variante del átomo Badge (la app ya tenía el componente; no se reimplementa)
const STATUS = {
  pendiente: { label: 'Pendiente', variant: 'neutral' },
  asignado: { label: 'Asignado', variant: 'info' },
  en_transito: { label: 'En tránsito', variant: 'warning' },
  en_agencia: { label: 'En agencia', variant: 'info' },
  entregado: { label: 'Entregado', variant: 'success' },
  siniestro: { label: 'Siniestro', variant: 'danger' },
  devuelto: { label: 'Devuelto', variant: 'warning' },
  cancelado: { label: 'Cancelado', variant: 'neutral' },
  planeada: { label: 'Planeada', variant: 'info' },
  completada: { label: 'Completada', variant: 'success' },
};

export function StatusBadge({ status }) {
  const s = STATUS[status] ?? { label: status ?? '—', variant: 'neutral' };
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
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-surface-500">{label}</p>
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
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-surface-500">Últimos eventos</p>
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
    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-surface-500">{label}</p>
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
  const [state, setState] = useState({ status: 'pending' }); // pending | working | done | cancelled | error

  const call = async (verb) => {
    setState({ status: 'working', verb });
    try {
      const res = await apiService.post(`/ai-agent/actions/${action.id}/${verb}`);
      setState({ status: verb === 'confirm' ? 'done' : 'cancelled', message: res?.result?.message, results: res?.result?.data?.results });
    } catch (err) {
      setState({ status: 'error', message: err?.message || 'No se pudo completar la acción.' });
    }
  };

  const working = state.status === 'working';
  const finished = state.status === 'done' || state.status === 'cancelled';
  const tone = state.status === 'done' ? 'border-emerald-300' : state.status === 'cancelled' ? 'border-surface-200' : state.status === 'error' ? 'border-red-300' : 'border-amber-300';

  return (
    <Card className={`!border-2 ${tone}`}>
      <div className="flex items-center gap-2 border-b border-surface-100 bg-surface-50 px-4 py-3">
        {state.status === 'done' ? <CheckCircle2 size={16} className="text-emerald-600" /> : state.status === 'cancelled' ? <XCircle size={16} className="text-surface-500" /> : <ShieldAlert size={16} className="text-amber-600" />}
        <p className="text-sm font-bold text-surface-900">{action.title}</p>
        <span className="ml-auto text-xs font-semibold uppercase tracking-[0.16em] text-surface-500">
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
      {state.status === 'cancelled' && <p role="status" className="border-t border-surface-100 bg-surface-50 px-4 py-3 text-sm text-surface-600">{state.message ?? 'Acción cancelada. No se hizo ningún cambio.'}</p>}
      {state.status === 'error' && <p role="alert" className="border-t border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{state.message}</p>}

      {!finished && state.status !== 'error' && (
        <div className="flex flex-col gap-3 border-t border-surface-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-surface-500">Nada se ha hecho todavía. Revisa los datos antes de confirmar.</p>
          <div className="flex shrink-0 gap-2">
            <Button variant="secondary" onClick={() => call('cancel')} disabled={working} className="min-h-11 flex-1 sm:flex-none">Cancelar</Button>
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
              <p className="border-t border-surface-100 px-4 pt-3 text-xs font-semibold uppercase tracking-[0.16em] text-surface-500">Los más cercanos</p>
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
      <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${tone}`}>{title} ({items.length})</p>
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
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-surface-500">Prioridades</p>
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
          <p className="px-4 pt-3 text-xs font-semibold uppercase tracking-[0.16em] text-surface-500">Requieren atención</p>
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
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-surface-500">Salen hoy</p>
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
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-surface-500">Conductores</p>
          <ul className="mt-1 space-y-0.5 text-sm text-surface-900">
            {data.top_drivers.map((d) => <li key={d.name}>{d.name} · {d.deliveries} {d.deliveries === 1 ? 'entrega' : 'entregas'}{d.efficiency_pct != null ? ` · ${d.efficiency_pct}% a tiempo` : ''}</li>)}
          </ul>
        </div>
      )}
      {(data.busiest_days ?? []).length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-surface-100 px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-surface-500">Más movimiento</span>
          {data.busiest_days.map((d) => <span key={d.date} className="rounded-full border border-surface-200 bg-surface-50 px-2.5 py-1 text-xs text-surface-700">{d.date}: {d.packages}</span>)}
        </div>
      )}
    </Card>
  );
}

/** Elige la tarjeta según el tipo de dato. */
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
    default: return null;
  }
}
