import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, Gauge } from 'lucide-react';
import apiService from '../../../services/apiService';
import Button from '../../../components/atoms/Button';
import Badge from '../../../components/atoms/Badge';
import Skeleton from '../../../components/atoms/Skeleton';
import EmptyState from '../../../components/molecules/EmptyState';
import ErrorState from '../../../components/molecules/ErrorState';

const RANGES = [{ days: 7, label: '7 días' }, { days: 30, label: '30 días' }];
const ALERT_TYPE_LABEL = {
  assign: 'Paquetes sueltos con viaje', delayed: 'Viaje que no salió', no_driver: 'Viaje sin conductor',
  client_delivered: 'Cliente: paquete entregado', client_in_transit: 'Cliente: paquete en camino', client_in_agency: 'Cliente: paquete en agencia', client_incident: 'Cliente: siniestro',
  driver_depart: 'Conductor: viaje por salir', driver_pending: 'Conductor: entregas pendientes',
};

const seconds = (ms) => (ms ? `${(ms / 1000).toFixed(1)} s` : '—');
const compact = (n) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} M` : n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)} mil` : String(n ?? 0));
const dayLabel = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-BO', { weekday: 'short', day: 'numeric' });

const TOOL_NAMES = {
  get_package_tracking: 'Ubicar un paquete', find_packages_by_person: 'Buscar por nombre', list_my_packages: 'Listar paquetes',
  get_operations_summary: 'Resumen de la operación', list_packages_needing_attention: 'Qué atender', get_daily_briefing: 'Resumen del día',
  get_fleet_status: 'Estado de la flota', check_fleet_availability: 'Disponibilidad de flota', find_available_trips: 'Viajes con espacio',
  list_routes: 'Listar rutas', get_route_info: 'Datos de una ruta', get_my_deliveries: 'Agenda del conductor', get_analytics_summary: 'Analítica',
  propose_register_event: 'Proponer evento', propose_deliver_package: 'Proponer entrega', propose_create_package: 'Proponer paquete', propose_assign_package: 'Proponer asignación',
};
const ROLE_NAMES = { admin: 'Administrador', logistics_operator: 'Operador', driver: 'Conductor', client: 'Cliente' };

function Kpi({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-surface-100 bg-white p-4 shadow-sm">
      <p className="text-sm text-surface-600">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold text-surface-950">{value}</p>
      {hint && <p className="mt-1 text-xs text-surface-600">{hint}</p>}
    </div>
  );
}

function Section({ title, hint, children }) {
  return (
    <section className="rounded-[1.6rem] border border-surface-100 bg-white p-5 shadow-sm">
      <h2 className="font-display text-lg font-semibold text-surface-950">{title}</h2>
      {hint && <p className="mt-1 text-sm text-surface-600">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Uso de la IA (administradores): cuánto se usa, qué tan bien responde y qué modelo atiende, sin mostrar lo que preguntó cada persona. */
export default function AiUsagePage() {
  const [days, setDays] = useState(7);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['ai-usage', days],
    queryFn: async () => (await apiService.getAiUsage(days))?.data,
    staleTime: 30 * 1000,
  });

  const maxDay = Math.max(1, ...(data?.by_day ?? []).map((d) => d.queries));
  const maxTool = Math.max(1, ...(data?.top_tools ?? []).map((t) => t.count));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/assistant" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary-700 hover:underline">
            <ArrowLeft size={16} aria-hidden="true" /> Volver al asistente
          </Link>
          <h1 className="mt-1 font-display text-3xl font-semibold text-surface-950">Uso de la IA</h1>
          <p className="mt-1 max-w-2xl text-sm text-surface-600">Cuánto se usa el asistente, qué tan rápido y qué tan bien responde, y qué modelo atendió cada consulta. Solo se guardan métricas: nunca el texto de las preguntas.</p>
        </div>
        <div role="group" aria-label="Período" className="flex gap-2">
          {RANGES.map((r) => (
            <Button key={r.days} variant={days === r.days ? 'primary' : 'secondary'} onClick={() => setDays(r.days)} className="min-h-11" aria-pressed={days === r.days}>
              {r.label}
            </Button>
          ))}
        </div>
      </header>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true" aria-label="Cargando">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
        </div>
      )}

      {isError && (
        <ErrorState title="No se pudo cargar el uso de la IA" description="Revisa tu conexión e inténtalo de nuevo." action={<Button onClick={() => refetch()}>Reintentar</Button>} />
      )}

      {data && data.totals.queries === 0 && (
        <EmptyState title="Aún no hay consultas en este período" description="Cuando alguien use el asistente, aquí verás los tiempos, los aciertos y el modelo que respondió." />
      )}

      {data && data.totals.queries > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Consultas" value={data.totals.queries} hint={`${data.totals.active_users} ${data.totals.active_users === 1 ? 'persona' : 'personas'}`} />
            <Kpi label="Respondidas bien" value={`${data.totals.success_pct}%`} hint={`${data.totals.errors} con error`} />
            <Kpi label="Tiempo típico" value={seconds(data.totals.median_ms)} hint={`9 de cada 10 en menos de ${seconds(data.totals.p90_ms)}`} />
            <Kpi label="Tokens usados" value={compact(data.totals.tokens)} hint={`${compact(data.totals.avg_tokens)} por consulta`} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Kpi label="Por el atajo (1 llamada)" value={`${data.totals.fast_path_pct}%`} />
            <Kpi label="Respuesta en vivo" value={`${data.totals.streamed_pct}%`} />
            <Kpi label="Por voz" value={`${data.totals.voice_pct}%`} />
          </div>

          {data.logi && (data.logi.alerts_shown + data.logi.guided_started + data.logi.demos) > 0 && (
            <Section title="Logi" hint="Cuánto ayudan sus avisos y las acciones que hace a la vista de todos. Solo se cuentan eventos, nunca contenido.">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Kpi label="Avisos mostrados" value={data.logi.alerts_shown} hint={`${data.logi.alerts_snoozed} pospuestos · ${data.logi.alerts_muted} silenciados`} />
                <Kpi label="Avisos aceptados" value={`${data.logi.alerts_accepted_pct}%`} hint={`${data.logi.alerts_accepted} de ${data.logi.alerts_shown}`} />
                <Kpi label="Acciones hechas por Logi" value={data.logi.guided_done} hint={`${data.logi.guided_done_pct}% de las ${data.logi.guided_started} empezadas`} />
                <Kpi label="Detenidas / de respaldo" value={`${data.logi.guided_stopped} / ${data.logi.guided_fallback}`} hint={`${data.logi.demos} demostraciones («Enséñame»)`} />
              </div>
              {data.logi.by_alert_type.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[22rem] text-left text-sm">
                    <caption className="sr-only">Avisos mostrados y aceptados por tipo</caption>
                    <thead>
                      <tr className="border-b border-surface-100 text-surface-600">
                        <th scope="col" className="py-2 pr-4 font-medium">Tipo de aviso</th>
                        <th scope="col" className="py-2 pr-4 font-medium">Mostrados</th>
                        <th scope="col" className="py-2 font-medium">Aceptados</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.logi.by_alert_type.map((t) => (
                        <tr key={t.type} className="border-b border-surface-50">
                          <th scope="row" className="py-3 pr-4 font-medium text-surface-900">{ALERT_TYPE_LABEL[t.type] ?? t.type}</th>
                          <td className="py-3 pr-4">{t.shown}</td>
                          <td className="py-3">{t.accepted}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
          )}

          <Section title="Por modelo" hint="Qué modelo respondió, con qué éxito y qué tan rápido.">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] text-left text-sm">
                <caption className="sr-only">Consultas, éxito, tiempo y tokens por modelo</caption>
                <thead>
                  <tr className="border-b border-surface-100 text-surface-600">
                    <th scope="col" className="py-2 pr-4 font-medium">Modelo</th>
                    <th scope="col" className="py-2 pr-4 font-medium">Consultas</th>
                    <th scope="col" className="py-2 pr-4 font-medium">Éxito</th>
                    <th scope="col" className="py-2 pr-4 font-medium">Tiempo medio</th>
                    <th scope="col" className="py-2 pr-4 font-medium">9 de 10 en</th>
                    <th scope="col" className="py-2 font-medium">Tokens/consulta</th>
                  </tr>
                </thead>
                <tbody>
                  {data.by_model.map((m) => (
                    <tr key={m.model} className="border-b border-surface-50">
                      <th scope="row" className="py-3 pr-4 font-medium text-surface-900">{m.model}</th>
                      <td className="py-3 pr-4">{m.queries}</td>
                      <td className="py-3 pr-4">{m.success_pct}%</td>
                      <td className="py-3 pr-4">{seconds(m.avg_ms)}</td>
                      <td className="py-3 pr-4">{seconds(m.p90_ms)}</td>
                      <td className="py-3">{compact(m.avg_tokens)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Consultas por día">
              <ol className="flex h-40 items-end gap-2" aria-label="Consultas por día">
                {data.by_day.map((d) => (
                  <li key={d.date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                    <span className="text-xs text-surface-600">{d.queries}</span>
                    <span
                      role="img"
                      aria-label={`${d.queries} consultas el ${d.date}${d.errors ? `, ${d.errors} con error` : ''}`}
                      className="w-full rounded-t-md bg-primary-500"
                      style={{ height: `${Math.max(d.queries ? 6 : 2, (d.queries / maxDay) * 100)}%`, opacity: d.queries ? 1 : 0.25 }}
                    />
                    <span className="truncate text-[0.75rem] text-surface-600">{dayLabel(d.date)}</span>
                  </li>
                ))}
              </ol>
            </Section>

            <Section title="Qué se consulta más">
              <ul className="space-y-3">
                {data.top_tools.map((t) => (
                  <li key={t.tool}>
                    <div className="flex justify-between text-sm"><span className="text-surface-800">{TOOL_NAMES[t.tool] ?? t.tool}</span><span className="text-surface-600">{t.count}</span></div>
                    <div className="mt-1 h-2 rounded-full bg-surface-100"><div className="h-2 rounded-full bg-primary-500" style={{ width: `${(t.count / maxTool) * 100}%` }} /></div>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm text-surface-600">
                Por rol: {data.by_role.map((r) => `${ROLE_NAMES[r.role] ?? r.role} ${r.queries}`).join(' · ')}
              </p>
            </Section>
          </div>

          {data.recent_errors.length > 0 && (
            <Section title="Últimos errores" hint="Las consultas que no se pudieron responder.">
              <ul className="space-y-2 text-sm">
                {data.recent_errors.map((e, i) => (
                  <li key={`${e.at}-${i}`} className="flex flex-wrap items-center gap-3">
                    <Badge variant="danger" size="lg">{e.status ?? 'error'}</Badge>
                    <span className="text-surface-800">{new Date(e.at).toLocaleString('es-BO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    {e.model && <span className="text-surface-600">{e.model}</span>}
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </>
      )}

      {data?.pool && (
        <Section title="Estado de los modelos ahora" hint={`Estrategia: ${data.pool.strategy === 'speed' ? 'preferir el más rápido' : 'repartir por carga'}. Un modelo "descansa" cuando agota su cuota o falla.`}>
          <ul className="grid gap-3 md:grid-cols-2">
            {data.pool.models.map((m) => (
              <li key={m.id} className="rounded-2xl border border-surface-100 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2 font-medium text-surface-900"><Gauge size={16} aria-hidden="true" className="text-primary-600" />{m.id}</span>
                  <Badge variant={m.available ? 'success' : 'warning'} size="lg">{m.available ? 'Disponible' : `Descansa ${m.cooldown_seconds}s`}</Badge>
                </div>
                <p className="mt-2 text-sm text-surface-600">
                  {m.ok} bien · {m.failed} fallos · {m.avg_ms ? seconds(m.avg_ms) : 'sin datos de tiempo'}
                  {m.tpm ? ` · ${compact(m.tokens_last_minute)}/${compact(m.tpm)} tokens este minuto` : ''}
                </p>
                {m.last_error && <p className="mt-1 truncate text-xs text-surface-600" title={m.last_error}>Último error: {m.last_error}</p>}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
