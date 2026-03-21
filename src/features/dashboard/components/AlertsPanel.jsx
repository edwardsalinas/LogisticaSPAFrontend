import { AlertTriangle, ShieldCheck, TimerReset, Truck } from 'lucide-react';

const operationalAlerts = [
  { title: '2 rutas con ventana ajustada', detail: 'RT-014 y RT-022 requieren seguimiento antes de las 16:00.', icon: AlertTriangle, tone: 'text-amber-700 bg-amber-50 border-amber-100' },
  { title: 'Cobertura SLA por encima del objetivo', detail: 'Se mantiene en 98.4% con 9 entregas cerradas hoy.', icon: ShieldCheck, tone: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
  { title: 'Flota disponible para reasignacion', detail: '6 unidades listas para nuevas ordenes en menos de 20 minutos.', icon: Truck, tone: 'text-sky-700 bg-sky-50 border-sky-100' },
];

export default function AlertsPanel() {
  return (
    <article className="rounded-[1.8rem] border border-white/70 bg-white/85 p-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.32)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-surface-500">Alertas y foco</p>
          <h3 className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em] text-surface-950">Supervision curada.</h3>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
          <TimerReset size={20} strokeWidth={2.2} />
        </div>
      </div>
      <div className="mt-5 space-y-3">
        {operationalAlerts.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="flex gap-3 rounded-[1.2rem] border border-surface-100 bg-surface-50/80 p-4">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${item.tone}`}>
                <Icon size={18} strokeWidth={2.2} />
              </div>
              <div>
                <p className="text-sm font-semibold text-surface-900">{item.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-surface-500">{item.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
