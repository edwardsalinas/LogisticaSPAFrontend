import { MapPinned } from 'lucide-react';

export default function LiveMapSummary({ stats }) {
  return (
    <article className="relative overflow-hidden rounded-[1.8rem] border border-[#0a2745] bg-[linear-gradient(160deg,#06111f_0%,#0d2847_55%,#123a63_100%)] p-6 text-white shadow-[0_28px_80px_-48px_rgba(2,36,72,0.75)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.22),transparent_36%)]" />
      <div className="relative">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-100/80">
          <MapPinned size={14} strokeWidth={2.2} />Mapa vivo
        </div>
        <h3 className="mt-4 font-display text-[2rem] font-semibold tracking-[-0.05em]">
          Flota en la calle ahora
        </h3>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-300">
          La interfaz destaca zonas activas, alertas y flujo operativo sin depender solo del mapa tecnico.
        </p>
        <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/6 p-4 backdrop-blur-sm">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/8 bg-white/6 p-3">
              <p className="text-xs font-semibold tracking-normal text-slate-200">En ruta</p>
              <p className="mt-2 font-display text-2xl font-semibold">{stats?.packagesInTransit || 0}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/6 p-3">
              <p className="text-xs font-semibold tracking-normal text-slate-200">Pendientes</p>
              <p className="mt-2 font-display text-2xl font-semibold">{stats?.packagesPending || 0}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/6 p-3">
              <p className="text-xs font-semibold tracking-normal text-slate-200">Críticas</p>
              <p className="mt-2 font-display text-2xl font-semibold">{stats?.packagesDelayed || 0}</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            {[
              { label: 'Siniestros reportados', count: stats?.packagesIncident || 0, alert: 'Atencion', bad: 'text-red-300', badDot: 'bg-red-400' },
              { label: 'Despachos con retraso', count: stats?.packagesDelayed || 0, alert: 'Revisar', bad: 'text-amber-300', badDot: 'bg-amber-400' },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/6 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`h-2.5 w-2.5 rounded-full ${row.count > 0 ? row.badDot : 'bg-emerald-400'}`} />
                  <span className="text-sm text-slate-100">{row.label}: {row.count}</span>
                </div>
                <span className={`text-xs font-semibold uppercase tracking-[0.14em] ${row.count > 0 ? row.bad : 'text-emerald-300'}`}>{row.count > 0 ? row.alert : 'OK'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
