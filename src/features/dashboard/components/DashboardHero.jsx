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
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-sky-100/85 backdrop-blur"><Gauge size={14} strokeWidth={2.2} />Resumen ejecutivo</div>
          <h1 className="mt-5 max-w-3xl font-display text-[clamp(2.2rem,5vw,4.25rem)] font-semibold tracking-[-0.06em] text-white">Operacion con criterio visual, lectura rapida y foco en decisiones.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">Unificamos entregas, flota, SLA y alertas en una superficie mas clara para que el equipo lea el estado del negocio sin pelear contra la interfaz.</p>
        </div>
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 rounded-[1.7rem] border border-white/10 bg-white/6 p-4 backdrop-blur-xl sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-[1.35rem] border border-white/10 bg-white/8 p-4 text-white"><p className="text-[0.68rem] uppercase tracking-[0.18em] text-slate-300">Flota activa</p><p className="mt-3 font-display text-3xl font-semibold tracking-[-0.05em]">{stats?.totalVehicles || 0}</p><p className="mt-2 text-xs text-slate-300">vehiculos con cobertura en tiempo real</p></div>
            <div className="rounded-[1.35rem] border border-white/10 bg-white/8 p-4 text-white"><p className="text-[0.68rem] uppercase tracking-[0.18em] text-slate-300">Conductores</p><p className="mt-3 font-display text-3xl font-semibold tracking-[-0.05em]">{stats?.totalDrivers || 0}</p><p className="mt-2 text-xs text-slate-300">equipos listos para reasignacion</p></div>
            <div className="rounded-[1.35rem] border border-sky-400/20 bg-sky-400/10 p-4 text-white"><p className="text-[0.68rem] uppercase tracking-[0.18em] text-sky-100/80">Rendimiento</p><div className="mt-3 flex items-center gap-2 text-3xl font-semibold tracking-[-0.05em]"><span className="font-display">+14%</span><ArrowUpRight size={20} className="text-sky-300" strokeWidth={2.4} /></div><p className="mt-2 text-xs text-sky-100/80">mejor lectura operativa frente al corte anterior</p></div>
          </div>
          <div className="rounded-[1.7rem] border border-white/10 bg-white/6 p-3 backdrop-blur-xl">
            <div className="grid grid-cols-4 gap-2.5">
              <div className="rounded-[1.35rem] border border-white/10 bg-white/8 p-4 text-white">
                <PackageCheck size={18} className="text-sky-300" strokeWidth={2.2} />
                <p className="mt-2 text-[0.6rem] uppercase tracking-[0.18em] text-slate-300">Entregas hoy</p>
                <p className="mt-1 font-display text-2xl font-semibold tracking-[-0.05em]">{stats?.totalPackages || 0}</p>
              </div>
              <div className="rounded-[1.35rem] border border-white/10 bg-white/8 p-4 text-white">
                <Truck size={18} className="text-emerald-300" strokeWidth={2.2} />
                <p className="mt-2 text-[0.6rem] uppercase tracking-[0.18em] text-slate-300">Rutas en curso</p>
                <p className="mt-1 font-display text-2xl font-semibold tracking-[-0.05em]">{stats?.activeRoutes || 0}</p>
              </div>
              <div className="rounded-[1.35rem] border border-white/10 bg-white/8 p-4 text-white">
                <MapPinned size={18} className="text-amber-300" strokeWidth={2.2} />
                <p className="mt-2 text-[0.6rem] uppercase tracking-[0.18em] text-slate-300">Distancia</p>
                <p className="mt-1 font-display text-2xl font-semibold tracking-[-0.05em]">8,420 km</p>
              </div>
              <div className="rounded-[1.35rem] border border-white/10 bg-white/8 p-4 text-white">
                <ShieldCheck size={18} className="text-violet-300" strokeWidth={2.2} />
                <p className="mt-2 text-[0.6rem] uppercase tracking-[0.18em] text-slate-300">SLA</p>
                <p className="mt-1 font-display text-2xl font-semibold tracking-[-0.05em]">98.4%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
