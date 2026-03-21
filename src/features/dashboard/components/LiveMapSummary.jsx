import { MapPinned } from 'lucide-react';

export default function LiveMapSummary() {
  return (
    <article className="relative overflow-hidden rounded-[1.8rem] border border-[#0a2745] bg-[linear-gradient(160deg,#06111f_0%,#0d2847_55%,#123a63_100%)] p-6 text-white shadow-[0_28px_80px_-48px_rgba(2,36,72,0.75)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.22),transparent_36%)]" />
      <div className="relative">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-sky-100/80">
          <MapPinned size={14} strokeWidth={2.2} />Mapa vivo
        </div>
        <h3 className="mt-4 font-display text-[2rem] font-semibold tracking-[-0.05em]">
          Cobertura lista para lectura inmediata.
        </h3>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-300">
          La interfaz destaca zonas activas, alertas y flujo operativo sin depender solo del mapa tecnico.
        </p>
        <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/6 p-4 backdrop-blur-sm">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/8 bg-white/6 p-3">
              <p className="text-[0.62rem] uppercase tracking-[0.18em] text-slate-300">En ruta</p>
              <p className="mt-2 font-display text-2xl font-semibold">18</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/6 p-3">
              <p className="text-[0.62rem] uppercase tracking-[0.18em] text-slate-300">Pendientes</p>
              <p className="mt-2 font-display text-2xl font-semibold">7</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/6 p-3">
              <p className="text-[0.62rem] uppercase tracking-[0.18em] text-slate-300">Criticas</p>
              <p className="mt-2 font-display text-2xl font-semibold">2</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/6 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="text-sm text-slate-100">Red principal estable</span>
              </div>
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300">OK</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/6 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="text-sm text-slate-100">2 rutas con trafico</span>
              </div>
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-300">Watch</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
