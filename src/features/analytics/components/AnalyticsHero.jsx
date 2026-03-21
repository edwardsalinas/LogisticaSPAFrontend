import {
  AlertTriangle,
  CalendarRange,
  PackageCheck,
  ShieldCheck,
  TimerReset,
} from 'lucide-react';
import { heroImages } from '../../../constants/heroImages';

export default function AnalyticsHero() {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,#06111f_0%,#0b1d34_35%,#f8fbff_100%)] p-7 shadow-[0_28px_80px_-48px_rgba(2,36,72,0.7)] sm:p-8">
      <div className="absolute inset-0">
        <img src={heroImages.analytics.url} alt={heroImages.analytics.alt} className="h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(6,17,31,0.94)_0%,rgba(11,29,52,0.84)_38%,rgba(11,29,52,0.34)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.18),transparent_34%)]" />
      </div>
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.95fr)] lg:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-sky-100/85 backdrop-blur">
            <CalendarRange size={14} strokeWidth={2.2} />
            Inteligencia operativa
          </div>
          <h1 className="mt-5 max-w-3xl font-display text-[clamp(2.2rem,5vw,4.1rem)] font-semibold tracking-[-0.06em] text-white">
            Analitica pensada para leer rendimiento, no solo acumular datos.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
            Consolidamos volumen, cumplimiento, demoras y rendimiento del equipo en una superficie mas clara para toma de decisiones ejecutivas.
          </p>
        </div>

        <div className="flex flex-col gap-3 lg:gap-4">
          <div className="rounded-[1.7rem] border border-white/10 bg-white/6 p-3 backdrop-blur-xl">
            <div className="grid grid-cols-4 gap-2.5">
              <div className="rounded-[1.35rem] border border-white/10 bg-white/8 p-4 text-white">
                <PackageCheck size={18} className="text-sky-300" strokeWidth={2.2} />
                <p className="mt-2 text-[0.6rem] uppercase tracking-[0.18em] text-slate-300">Envios totales</p>
                <p className="mt-1 font-display text-2xl font-semibold tracking-[-0.05em]">12,482</p>
              </div>
              <div className="rounded-[1.35rem] border border-white/10 bg-white/8 p-4 text-white">
                <ShieldCheck size={18} className="text-emerald-300" strokeWidth={2.2} />
                <p className="mt-2 text-[0.6rem] uppercase tracking-[0.18em] text-slate-300">A tiempo</p>
                <p className="mt-1 font-display text-2xl font-semibold tracking-[-0.05em]">94.2%</p>
              </div>
              <div className="rounded-[1.35rem] border border-white/10 bg-white/8 p-4 text-white">
                <TimerReset size={18} className="text-amber-300" strokeWidth={2.2} />
                <p className="mt-2 text-[0.6rem] uppercase tracking-[0.18em] text-slate-300">Demora prom.</p>
                <p className="mt-1 font-display text-2xl font-semibold tracking-[-0.05em]">2.4 hrs</p>
              </div>
              <div className="rounded-[1.35rem] border border-white/10 bg-white/8 p-4 text-white">
                <AlertTriangle size={18} className="text-violet-300" strokeWidth={2.2} />
                <p className="mt-2 text-[0.6rem] uppercase tracking-[0.18em] text-slate-300">Incidencias</p>
                <p className="mt-1 font-display text-2xl font-semibold tracking-[-0.05em]">14</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
