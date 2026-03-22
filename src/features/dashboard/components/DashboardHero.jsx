import { ArrowUpRight, Gauge, MapPinned, PackageCheck, ShieldCheck, Truck } from 'lucide-react';
import { heroImages } from '../../../constants/heroImages';

export default function DashboardHero({ stats }) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/70 shadow-[0_28px_80px_-48px_rgba(2,36,72,0.7)] sm:p-8">
      <div className="absolute inset-0">
        <img src={heroImages.dashboard.url} alt={heroImages.dashboard.alt} className="h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(6,17,31,0.94)_0%,rgba(11,29,52,0.84)_38%,rgba(11,29,52,0.34)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.18),transparent_34%)]" />
      </div>
      <div className="relative grid gap-8 p-7 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.95fr)] lg:items-end sm:p-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.2em] text-sky-100/90 backdrop-blur-md">
            <Gauge size={14} strokeWidth={2.4} />
            Resumen ejecutivo
          </div>
          <h1 className="mt-5 max-w-3xl font-display text-[clamp(2.2rem,5vw,4.25rem)] font-semibold tracking-[-0.06em] text-white">
            Operacion con criterio visual, lectura rapida y foco.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
            Unificamos entregas, flota, SLA y alertas en una superficie mas clara para que el equipo lea el estado del negocio sin pelear contra la interfaz.
          </p>
        </div>
        <div className="flex flex-col gap-3 lg:gap-4">
          <div className="grid gap-3 rounded-[1.7rem] border border-white/15 bg-white/5 p-3 sm:p-4 backdrop-blur-xl shadow-2xl sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            
            <div className="group relative overflow-hidden rounded-[1.35rem] border border-white/20 bg-white/10 p-4 text-white transition-all duration-300 hover:bg-white/15 hover:shadow-lg hover:-translate-y-0.5">
              <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-sky-400/20 blur-2xl transition-all duration-500 group-hover:bg-sky-400/40"></div>
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-white/70">Flota activa</p>
              <p className="mt-2 font-display text-3xl font-bold tracking-[-0.04em]">{stats?.totalVehicles || 0}</p>
              <p className="mt-1 text-xs text-white/50">vehiculos vivos</p>
            </div>
            
            <div className="group relative overflow-hidden rounded-[1.35rem] border border-white/20 bg-white/10 p-4 text-white transition-all duration-300 hover:bg-white/15 hover:shadow-lg hover:-translate-y-0.5">
              <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-violet-400/20 blur-2xl transition-all duration-500 group-hover:bg-violet-400/40"></div>
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-white/70">Conductores</p>
              <p className="mt-2 font-display text-3xl font-bold tracking-[-0.04em]">{stats?.totalDrivers || 0}</p>
              <p className="mt-1 text-xs text-white/50">equipos listos</p>
            </div>
            
            <div className="group relative overflow-hidden rounded-[1.35rem] border border-sky-400/30 bg-sky-400/15 p-4 text-white transition-all duration-300 hover:bg-sky-400/20 hover:shadow-lg hover:-translate-y-0.5">
              <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-sky-300/20 blur-2xl transition-all duration-500 group-hover:bg-sky-300/40"></div>
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-sky-200">Rendimiento</p>
              <div className="mt-2 flex items-center gap-2 text-3xl font-bold tracking-[-0.04em]">
                <span className="font-display">+14%</span><ArrowUpRight size={20} className="text-sky-300" strokeWidth={2.4} />
              </div>
              <p className="mt-1 text-xs text-sky-200/70">frente al corte</p>
            </div>
          </div>
          
          <div className="rounded-[1.7rem] border border-white/15 bg-white/5 p-3 sm:p-4 backdrop-blur-xl shadow-2xl">
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              
              <div className="group relative overflow-hidden rounded-[1.35rem] border border-white/20 bg-white/10 p-2 sm:p-3 text-white transition-all duration-300 hover:bg-white/15 hover:-translate-y-0.5">
                <div className="flex flex-col items-center justify-center gap-1.5 text-center">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-400/20 text-sky-300">
                    <PackageCheck size={16} strokeWidth={2.4} />
                  </div>
                  <div>
                    <p className="text-[0.45rem] font-bold uppercase tracking-[0.18em] text-white/70">Entreg hoy</p>
                    <p className="mt-0.5 font-display text-lg font-bold tracking-[-0.04em]">{stats?.totalPackages || 0}</p>
                  </div>
                </div>
              </div>
              
              <div className="group relative overflow-hidden rounded-[1.35rem] border border-white/20 bg-white/10 p-2 sm:p-3 text-white transition-all duration-300 hover:bg-white/15 hover:-translate-y-0.5">
                <div className="flex flex-col items-center justify-center gap-1.5 text-center">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-400/20 text-emerald-300">
                    <Truck size={16} strokeWidth={2.4} />
                  </div>
                  <div>
                    <p className="text-[0.45rem] font-bold uppercase tracking-[0.18em] text-white/70">En curso</p>
                    <p className="mt-0.5 font-display text-lg font-bold tracking-[-0.04em]">{stats?.activeRoutes || 0}</p>
                  </div>
                </div>
              </div>
              
              <div className="group relative overflow-hidden rounded-[1.35rem] border border-white/20 bg-white/10 p-2 sm:p-3 text-white transition-all duration-300 hover:bg-white/15 hover:-translate-y-0.5">
                <div className="flex flex-col items-center justify-center gap-1.5 text-center">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300">
                    <MapPinned size={16} strokeWidth={2.4} />
                  </div>
                  <div>
                    <p className="text-[0.45rem] font-bold uppercase tracking-[0.18em] text-white/70">Distancia</p>
                    <p className="mt-0.5 font-display text-lg font-bold tracking-[-0.04em]">8,4k km</p>
                  </div>
                </div>
              </div>
              
              <div className="group relative overflow-hidden rounded-[1.35rem] border border-white/20 bg-white/10 p-2 sm:p-3 text-white transition-all duration-300 hover:bg-white/15 hover:-translate-y-0.5">
                <div className="flex flex-col items-center justify-center gap-1.5 text-center">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-400/20 text-violet-300">
                    <ShieldCheck size={16} strokeWidth={2.4} />
                  </div>
                  <div>
                    <p className="text-[0.45rem] font-bold uppercase tracking-[0.18em] text-white/70">SLA Gbl</p>
                    <p className="mt-0.5 font-display text-lg font-bold tracking-[-0.04em]">98%</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
