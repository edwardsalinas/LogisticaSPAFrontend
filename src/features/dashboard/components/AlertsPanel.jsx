import { AlertTriangle, ShieldCheck, TimerReset, Truck } from 'lucide-react';

const operationalAlerts = [
  { title: '2 rutas con ventana ajustada', detail: 'RT-014 y RT-022 requieren seguimiento antes de las 16:00.', icon: AlertTriangle, tone: 'text-amber-700 bg-amber-50 border-amber-100' },
  { title: 'Cobertura SLA por encima del objetivo', detail: 'Se mantiene en 98.4% con 9 entregas cerradas hoy.', icon: ShieldCheck, tone: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
  { title: 'Flota disponible para reasignación', detail: '6 unidades listas para nuevas ordenes en menos de 20 minutos.', icon: Truck, tone: 'text-sky-700 bg-sky-50 border-sky-100' },
];

export default function AlertsPanel({ stats }) {
  const alerts = [];

  // Alerta de siniestros (excepción logística)
  if (stats?.packagesIncident > 0) {
    alerts.push({
      title: `${stats.packagesIncident} ${stats.packagesIncident === 1 ? 'paquete con siniestro' : 'paquetes con siniestro'}`,
      detail: 'Requieren atención inmediata: revisa el historial y contacta al cliente.',
      icon: AlertTriangle,
      tone: 'text-red-700 bg-red-50 border-red-100'
    });
  }

  // Alerta de retrasos
  if (stats?.packagesDelayed > 0) {
    alerts.push({
      title: `${stats.packagesDelayed} despachos con retraso`,
      detail: 'Se recomienda revisar las rutas activas para identificar cuellos de botella.',
      icon: AlertTriangle,
      tone: 'text-amber-700 bg-amber-50 border-amber-100'
    });
  }

  // Tasa de entrega: la cifra del backend es entregados / total de paquetes (no mide puntualidad)
  if (stats?.sla >= 95) {
    alerts.push({
      title: 'Tasa de entrega saludable',
      detail: `El ${stats.sla}% de los paquetes registrados ya fue entregado.`,
      icon: ShieldCheck,
      tone: 'text-emerald-700 bg-emerald-50 border-emerald-100'
    });
  }

  // Alerta de Flota
  if (stats?.totalVehicles > 0) {
    alerts.push({
      title: 'Capacidad operativa disponible',
      detail: `${stats.totalVehicles} unidades listas para nuevas asignaciones.`,
      icon: Truck,
      tone: 'text-sky-700 bg-sky-50 border-sky-100'
    });
  }

  // Si no hay alertas específicas, mostrar un placeholder informativo
  if (alerts.length === 0) {
    alerts.push({
      title: 'Operación estable',
      detail: 'No se detectan anomalías críticas en el flujo actual.',
      icon: ShieldCheck,
      tone: 'text-slate-700 bg-slate-50 border-slate-100'
    });
  }

  return (
    <article className="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-xl font-semibold tracking-[-0.03em] text-surface-950">Alertas y foco</h3>
          <p className="mt-1 text-sm text-surface-600">Lo que conviene revisar ahora.</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
          <TimerReset size={20} strokeWidth={2.2} />
        </div>
      </div>
      <div className="mt-5 space-y-3">
        {alerts.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="flex gap-3 rounded-xl border border-surface-200 bg-surface-50 p-4">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${item.tone}`}>
                <Icon size={18} strokeWidth={2.2} />
              </div>
              <div>
                <p className="text-sm font-semibold text-surface-900">{item.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-surface-600">{item.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
