import { MapPinned, Route, Search } from 'lucide-react';
import { heroImages } from '../../../constants/heroImages';

export default function RoutesHero({ active, pending, completed }) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,#06111f_0%,#0b1d34_35%,#f8fbff_100%)] p-6 shadow-[0_28px_80px_-48px_rgba(2,36,72,0.7)] sm:p-8">
      <div className="absolute inset-0">
        <img src={heroImages.routes.url} alt={heroImages.routes.alt} className="h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(6,17,31,0.94)_0%,rgba(11,29,52,0.84)_38%,rgba(11,29,52,0.34)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.18),transparent_34%)]" />
      </div>
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.95fr)] lg:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.2em] text-sky-100/90 backdrop-blur-md">
            <Route size={14} strokeWidth={2.4} />
            Monitoreo de rutas
          </div>
          <h1 className="mt-5 max-w-3xl font-display text-[clamp(2.1rem,5vw,4rem)] font-semibold tracking-[-0.06em] text-white">
            Rutas, checkpoints y vehiculos en una sola superficie.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
            El layout prioriza seleccion, contexto y mapa vivo para que cada ruta se entienda rapido sin perder detalle operativo.
          </p>
        </div>
        <div className="flex flex-col gap-3 lg:gap-4">
          <div className="rounded-[1.7rem] border border-white/15 bg-white/5 p-3 sm:p-4 backdrop-blur-xl shadow-2xl">
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              
              <div className="group relative overflow-hidden rounded-[1.35rem] border border-white/20 bg-white/10 p-2 sm:p-4 text-white transition-all duration-300 hover:bg-white/15 hover:shadow-lg hover:-translate-y-0.5">
                <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-sky-400/20 blur-2xl transition-all duration-500 group-hover:bg-sky-400/40"></div>
                <div className="relative flex flex-col items-center justify-center text-center gap-1.5 mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-400/20 text-sky-300">
                    <Route size={16} strokeWidth={2.4} />
                  </div>
                  <p className="text-[0.45rem] font-bold uppercase tracking-[0.15em] text-white/70">En Curso</p>
                </div>
                <p className="relative mt-1 text-center font-display text-2xl sm:text-3xl font-bold tracking-[-0.04em]">{active}</p>
              </div>

              <div className="group relative overflow-hidden rounded-[1.35rem] border border-white/20 bg-white/10 p-2 sm:p-4 text-white transition-all duration-300 hover:bg-white/15 hover:shadow-lg hover:-translate-y-0.5">
                <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-amber-400/20 blur-2xl transition-all duration-500 group-hover:bg-amber-400/40"></div>
                <div className="relative flex flex-col items-center justify-center text-center gap-1.5 mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300">
                    <Search size={16} strokeWidth={2.4} />
                  </div>
                  <p className="text-[0.45rem] font-bold uppercase tracking-[0.15em] text-white/70">Planeados</p>
                </div>
                <p className="relative mt-1 text-center font-display text-2xl sm:text-3xl font-bold tracking-[-0.04em]">{pending}</p>
              </div>

              <div className="group relative overflow-hidden rounded-[1.35rem] border border-white/20 bg-white/10 p-2 sm:p-4 text-white transition-all duration-300 hover:bg-white/15 hover:shadow-lg hover:-translate-y-0.5">
                <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-emerald-400/20 blur-2xl transition-all duration-500 group-hover:bg-emerald-400/40"></div>
                <div className="relative flex flex-col items-center justify-center text-center gap-1.5 mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-400/20 text-emerald-300">
                    <MapPinned size={16} strokeWidth={2.4} />
                  </div>
                  <p className="text-[0.45rem] font-bold uppercase tracking-[0.15em] text-white/70">Finalizados</p>
                </div>
                <p className="relative mt-1 text-center font-display text-2xl sm:text-3xl font-bold tracking-[-0.04em]">{completed}</p>
              </div>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
