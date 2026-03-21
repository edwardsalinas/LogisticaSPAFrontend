import { ShieldCheck, Truck, UserRound, Wrench } from 'lucide-react';
import { heroImages } from '../../../constants/heroImages';

export default function FleetHero({ vehiclesCount, driversCount, availability, maintenanceCount }) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,#06111f_0%,#0b1d34_35%,#f8fbff_100%)] p-7 shadow-[0_28px_80px_-48px_rgba(2,36,72,0.7)] sm:p-8">
      <div className="absolute inset-0">
        <img src={heroImages.fleet.url} alt={heroImages.fleet.alt} className="h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(6,17,31,0.94)_0%,rgba(11,29,52,0.84)_38%,rgba(11,29,52,0.34)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.18),transparent_34%)]" />
      </div>
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.95fr)] lg:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-sky-100/85 backdrop-blur"><Truck size={14} strokeWidth={2.2} />Fleet control</div>
          <h1 className="mt-5 max-w-3xl font-display text-[clamp(2.1rem,5vw,4rem)] font-semibold tracking-[-0.06em] text-white">Gestion de flota con lectura clara de disponibilidad, mantenimiento y equipo.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">Priorizamos estado operativo, capacidad y asignacion de conductores en una sola vista para que el equipo responda mas rapido.</p>
        </div>
        <div className="rounded-[1.7rem] border border-white/10 bg-white/6 p-3 backdrop-blur-xl">
          <div className="grid grid-cols-4 gap-2">
            <div className="rounded-[1.1rem] border border-white/10 bg-white/8 px-3 py-3.5 text-white text-center">
              <Truck size={16} className="mx-auto text-sky-300" strokeWidth={2.2} />
              <p className="mt-1.5 text-[0.55rem] uppercase tracking-[0.18em] text-slate-300">Vehiculos</p>
              <p className="mt-0.5 font-display text-xl font-semibold tracking-[-0.05em]">{vehiclesCount}</p>
            </div>
            <div className="rounded-[1.1rem] border border-white/10 bg-white/8 px-3 py-3.5 text-white text-center">
              <ShieldCheck size={16} className="mx-auto text-emerald-300" strokeWidth={2.2} />
              <p className="mt-1.5 text-[0.55rem] uppercase tracking-[0.18em] text-slate-300">Disponibilidad</p>
              <p className="mt-0.5 font-display text-xl font-semibold tracking-[-0.05em]">{availability}%</p>
            </div>
            <div className="rounded-[1.1rem] border border-white/10 bg-white/8 px-3 py-3.5 text-white text-center">
              <Wrench size={16} className="mx-auto text-amber-300" strokeWidth={2.2} />
              <p className="mt-1.5 text-[0.55rem] uppercase tracking-[0.18em] text-slate-300">Mantenimiento</p>
              <p className="mt-0.5 font-display text-xl font-semibold tracking-[-0.05em]">{maintenanceCount}</p>
            </div>
            <div className="rounded-[1.1rem] border border-white/10 bg-white/8 px-3 py-3.5 text-white text-center">
              <UserRound size={16} className="mx-auto text-violet-300" strokeWidth={2.2} />
              <p className="mt-1.5 text-[0.55rem] uppercase tracking-[0.18em] text-slate-300">Conductores</p>
              <p className="mt-0.5 font-display text-xl font-semibold tracking-[-0.05em]">{driversCount}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
