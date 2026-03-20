import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  Gauge,
  MapPinned,
  MoveRight,
  PackageCheck,
  ShieldCheck,
  TimerReset,
  Truck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import Avatar from '../../../components/atoms/Avatar';
import Badge from '../../../components/atoms/Badge';
import ProgressBar from '../../../components/atoms/ProgressBar';
import StatCard from '../../../components/molecules/StatCard';
import PageSkeleton from '../../../components/organisms/PageSkeleton';
import { heroImages } from '../../../constants/heroImages';
import apiService from '../../../services/apiService';

const MOCK_SHIPMENTS = [
  { id: '#LOG-7842', destination: 'La Paz -> Oruro', operator: { name: 'Juan Perez', initials: 'JP' }, status: 'in_transit', progress: 65, eta: '14:30' },
  { id: '#LOG-7843', destination: 'Santa Cruz -> Cochabamba', operator: { name: 'Maria Lopez', initials: 'ML' }, status: 'delivered', progress: 100, eta: 'Entregado' },
  { id: '#LOG-7844', destination: 'Sucre -> Potosi', operator: { name: 'Carlos Ruiz', initials: 'CR' }, status: 'pending', progress: 15, eta: '17:10' },
  { id: '#LOG-7845', destination: 'Tarija -> Santa Cruz', operator: { name: 'Ana Flores', initials: 'AF' }, status: 'in_transit', progress: 45, eta: '15:05' },
  { id: '#LOG-7846', destination: 'Oruro -> La Paz', operator: { name: 'Luis Garcia', initials: 'LG' }, status: 'delayed', progress: 30, eta: '16:40' },
];

const STATUS_MAP = {
  pending: { label: 'Pendiente', variant: 'warning' },
  in_transit: { label: 'En ruta', variant: 'info' },
  delivered: { label: 'Entregado', variant: 'success' },
  delayed: { label: 'Retraso', variant: 'danger' },
};

const operationalAlerts = [
  { title: '2 rutas con ventana ajustada', detail: 'RT-014 y RT-022 requieren seguimiento antes de las 16:00.', icon: AlertTriangle, tone: 'text-amber-700 bg-amber-50 border-amber-100' },
  { title: 'Cobertura SLA por encima del objetivo', detail: 'Se mantiene en 98.4% con 9 entregas cerradas hoy.', icon: ShieldCheck, tone: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
  { title: 'Flota disponible para reasignacion', detail: '6 unidades listas para nuevas ordenes en menos de 20 minutos.', icon: Truck, tone: 'text-sky-700 bg-sky-50 border-sky-100' },
];

function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pkgRes, routesRes, vehiclesRes, driversRes] = await Promise.all([
          apiService.getPackages(),
          apiService.getRoutes(),
          apiService.getVehicles(),
          apiService.getDrivers(),
        ]);
        const packages = pkgRes.data || [];
        const routes = routesRes.data || [];
        const vehicles = vehiclesRes.data || [];
        const drivers = driversRes.data || [];
        setStats({
          totalPackages: packages.length,
          activeRoutes: routes.filter((route) => route.status === 'active').length,
          totalVehicles: vehicles.length,
          totalDrivers: drivers.length,
        });
      } catch (err) {
        console.error('Error cargando dashboard:', err);
        setStats({ totalPackages: 24, activeRoutes: 8, totalVehicles: 42, totalDrivers: 38 });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <PageSkeleton stats={4} layout="dashboard" />;

  const kpis = [
    { label: 'Entregas hoy', value: stats?.totalPackages || 0, icon: PackageCheck, change: 12.5, changeLabel: 'vs ayer', caption: 'Ordenes cerradas dentro de la ventana diaria.', tone: 'blue' },
    { label: 'Rutas en curso', value: stats?.activeRoutes || 0, icon: Truck, change: 8.2, changeLabel: 'vs ayer', caption: 'Operaciones activas con telemetria en linea.', tone: 'emerald' },
    { label: 'Distancia acumulada', value: '8,420 km', icon: MapPinned, change: 5.2, changeLabel: 'vs ayer', caption: 'Recorrido total consolidado durante el turno.', tone: 'amber' },
    { label: 'SLA operativo', value: '98.4%', icon: ShieldCheck, change: 2.1, changeLabel: 'vs ayer', caption: 'Cumplimiento de promesa en despachos criticos.', tone: 'violet' },
  ];

  return (
    <div className="space-y-8">
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
          <div className="grid gap-3 rounded-[1.7rem] border border-white/10 bg-white/6 p-4 backdrop-blur-xl sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-[1.35rem] border border-white/10 bg-white/8 p-4 text-white"><p className="text-[0.68rem] uppercase tracking-[0.18em] text-slate-300">Flota activa</p><p className="mt-3 font-display text-3xl font-semibold tracking-[-0.05em]">{stats?.totalVehicles || 0}</p><p className="mt-2 text-xs text-slate-300">vehiculos con cobertura en tiempo real</p></div>
            <div className="rounded-[1.35rem] border border-white/10 bg-white/8 p-4 text-white"><p className="text-[0.68rem] uppercase tracking-[0.18em] text-slate-300">Conductores</p><p className="mt-3 font-display text-3xl font-semibold tracking-[-0.05em]">{stats?.totalDrivers || 0}</p><p className="mt-2 text-xs text-slate-300">equipos listos para reasignacion</p></div>
            <div className="rounded-[1.35rem] border border-sky-400/20 bg-sky-400/10 p-4 text-white"><p className="text-[0.68rem] uppercase tracking-[0.18em] text-sky-100/80">Rendimiento</p><div className="mt-3 flex items-center gap-2 text-3xl font-semibold tracking-[-0.05em]"><span className="font-display">+14%</span><ArrowUpRight size={20} className="text-sky-300" strokeWidth={2.4} /></div><p className="mt-2 text-xs text-sky-100/80">mejor lectura operativa frente al corte anterior</p></div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-4">{kpis.map((item) => <StatCard key={item.label} {...item} />)}</section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.9fr)]">
        <article className="overflow-hidden rounded-[1.8rem] border border-white/70 bg-white/85 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.32)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 border-b border-surface-100 px-6 py-6 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-surface-500">Despachos prioritarios</p><h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em] text-surface-950">Lectura rapida de lo que requiere seguimiento hoy.</h2></div>
            <button className="inline-flex items-center gap-2 text-sm font-semibold text-primary-700 transition-colors hover:text-primary-800">Ver operacion completa<MoveRight size={16} strokeWidth={2.2} /></button>
          </div>
          <div className="overflow-x-auto px-2 pb-2 sm:px-4 sm:pb-4"><table className="w-full border-separate border-spacing-y-3"><thead><tr><th className="px-4 py-3 text-left text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-surface-500">Despacho</th><th className="px-4 py-3 text-left text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-surface-500">Destino</th><th className="px-4 py-3 text-left text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-surface-500">Operador</th><th className="px-4 py-3 text-left text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-surface-500">Estado</th><th className="px-4 py-3 text-left text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-surface-500">ETA</th><th className="px-4 py-3 text-left text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-surface-500">Progreso</th></tr></thead><tbody>{MOCK_SHIPMENTS.map((shipment) => { const statusConfig = STATUS_MAP[shipment.status] || { label: shipment.status, variant: 'neutral' }; const progressTone = shipment.progress === 100 ? 'success' : shipment.progress >= 50 ? 'primary' : 'warning'; return (<tr key={shipment.id} className="rounded-[1.35rem] bg-surface-50/75 shadow-[0_10px_35px_-30px_rgba(15,23,42,0.4)]"><td className="rounded-l-[1.2rem] px-4 py-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-100 text-primary-700"><Boxes size={18} strokeWidth={2.1} /></div><div><p className="text-sm font-semibold text-surface-900">{shipment.id}</p><p className="text-xs text-surface-500">Despacho priorizado</p></div></div></td><td className="px-4 py-4 text-sm text-surface-700">{shipment.destination}</td><td className="px-4 py-4"><div className="flex items-center gap-3"><Avatar name={shipment.operator.name} size="sm" className="ring-2 ring-white" /><div><p className="text-sm font-semibold text-surface-800">{shipment.operator.name}</p><p className="text-xs text-surface-500">Operador asignado</p></div></div></td><td className="px-4 py-4"><Badge variant={statusConfig.variant}>{statusConfig.label}</Badge></td><td className="px-4 py-4 text-sm font-medium text-surface-700">{shipment.eta}</td><td className="rounded-r-[1.2rem] px-4 py-4"><div className="w-36"><ProgressBar value={shipment.progress} size="sm" variant={progressTone} showLabel /></div></td></tr>); })}</tbody></table></div>
        </article>
        <div className="space-y-6"><article className="relative overflow-hidden rounded-[1.8rem] border border-[#0a2745] bg-[linear-gradient(160deg,#06111f_0%,#0d2847_55%,#123a63_100%)] p-6 text-white shadow-[0_28px_80px_-48px_rgba(2,36,72,0.75)]"><div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.22),transparent_36%)]" /><div className="relative"><div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-sky-100/80"><MapPinned size={14} strokeWidth={2.2} />Mapa vivo</div><h3 className="mt-4 font-display text-[2rem] font-semibold tracking-[-0.05em]">Cobertura lista para lectura inmediata.</h3><p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-300">La interfaz destaca zonas activas, alertas y flujo operativo sin depender solo del mapa tecnico.</p><div className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/6 p-4 backdrop-blur-sm"><div className="grid grid-cols-3 gap-3"><div className="rounded-2xl border border-white/8 bg-white/6 p-3"><p className="text-[0.62rem] uppercase tracking-[0.18em] text-slate-300">En ruta</p><p className="mt-2 font-display text-2xl font-semibold">18</p></div><div className="rounded-2xl border border-white/8 bg-white/6 p-3"><p className="text-[0.62rem] uppercase tracking-[0.18em] text-slate-300">Pendientes</p><p className="mt-2 font-display text-2xl font-semibold">7</p></div><div className="rounded-2xl border border-white/8 bg-white/6 p-3"><p className="text-[0.62rem] uppercase tracking-[0.18em] text-slate-300">Criticas</p><p className="mt-2 font-display text-2xl font-semibold">2</p></div></div><div className="mt-5 grid gap-3"><div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/6 px-4 py-3"><div className="flex items-center gap-3"><div className="h-2.5 w-2.5 rounded-full bg-emerald-400" /><span className="text-sm text-slate-100">Red principal estable</span></div><span className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300">OK</span></div><div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/6 px-4 py-3"><div className="flex items-center gap-3"><div className="h-2.5 w-2.5 rounded-full bg-amber-400" /><span className="text-sm text-slate-100">2 rutas con trafico</span></div><span className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-300">Watch</span></div></div></div></div></article><article className="rounded-[1.8rem] border border-white/70 bg-white/85 p-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.32)] backdrop-blur-xl"><div className="flex items-center justify-between gap-4"><div><p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-surface-500">Alertas y foco</p><h3 className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em] text-surface-950">Supervision curada.</h3></div><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700"><TimerReset size={20} strokeWidth={2.2} /></div></div><div className="mt-5 space-y-3">{operationalAlerts.map((item) => { const Icon = item.icon; return (<div key={item.title} className="flex gap-3 rounded-[1.2rem] border border-surface-100 bg-surface-50/80 p-4"><div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${item.tone}`}><Icon size={18} strokeWidth={2.2} /></div><div><p className="text-sm font-semibold text-surface-900">{item.title}</p><p className="mt-1 text-sm leading-relaxed text-surface-500">{item.detail}</p></div></div>); })}</div></article></div>
      </section>
    </div>
  );
}

export default DashboardPage;