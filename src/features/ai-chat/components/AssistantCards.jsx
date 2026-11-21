import { Link } from 'react-router-dom';
import { Clock, MapPin, Package, Truck, User } from 'lucide-react';

/** Tarjetas con los datos estructurados que devuelven las herramientas del asistente. */

const STATUS = {
  pendiente: { label: 'Pendiente', tone: 'bg-slate-100 text-slate-700 border-slate-200' },
  asignado: { label: 'Asignado', tone: 'bg-blue-50 text-blue-700 border-blue-200' },
  en_transito: { label: 'En tránsito', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  en_agencia: { label: 'En agencia', tone: 'bg-violet-50 text-violet-700 border-violet-200' },
  entregado: { label: 'Entregado', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  siniestro: { label: 'Siniestro', tone: 'bg-red-50 text-red-700 border-red-200' },
  devuelto: { label: 'Devuelto', tone: 'bg-orange-50 text-orange-700 border-orange-200' },
  cancelado: { label: 'Cancelado', tone: 'bg-slate-100 text-slate-500 border-slate-200' },
  planeada: { label: 'Planeada', tone: 'bg-blue-50 text-blue-700 border-blue-200' },
  completada: { label: 'Completada', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

export function StatusBadge({ status }) {
  const s = STATUS[status] ?? { label: status ?? '—', tone: 'bg-slate-100 text-slate-700 border-slate-200' };
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wider ${s.tone}`}>{s.label}</span>;
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
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-surface-500">{label}</p>
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
          <p className="mb-2 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-surface-500">Últimos eventos</p>
          <ol className="space-y-2">
            {timeline.slice(0, 4).map((e, i) => (
              <li key={`${e.at}-${i}`} className="flex items-start gap-2.5 text-sm">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${i === 0 ? 'bg-primary-500' : 'bg-surface-300'}`} />
                <span className="min-w-0 flex-1 text-surface-800">
                  {e.status}
                  {e.note && <span className="block text-xs text-surface-500">“{e.note}”</span>}
                </span>
                <span className="shrink-0 text-xs text-surface-400">{formatDateTime(e.at)}</span>
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
                <Package size={16} className="shrink-0 text-surface-400" />
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
    <p className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-surface-500">{label}</p>
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

/** Elige la tarjeta según el tipo de dato. */
export function AttachmentCard({ attachment, onAsk, role }) {
  switch (attachment?.kind) {
    case 'package_tracking': return <PackageTrackingCard data={attachment} canOpenTracking={role !== 'driver'} />;
    case 'package_list': return <PackageListCard data={attachment} onAsk={onAsk} />;
    case 'operations_summary': return <OperationsSummaryCard data={attachment} />;
    case 'driver_agenda': return <DriverAgendaCard data={attachment} onAsk={onAsk} />;
    case 'fleet_status': return <FleetCard data={attachment} />;
    default: return null;
  }
}
