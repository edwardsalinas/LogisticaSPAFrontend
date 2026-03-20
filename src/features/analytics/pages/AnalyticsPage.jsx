import { Suspense, lazy, useState } from 'react';
import {
  AlertTriangle,
  CalendarRange,
  Download,
  Filter,
  PackageCheck,
  ShieldCheck,
  TimerReset,
} from 'lucide-react';
import Button from '../../../components/atoms/Button';
import DateRangePicker from '../../../components/molecules/DateRangePicker';
import SectionLoader from '../../../components/molecules/SectionLoader';
import StatCard from '../../../components/molecules/StatCard';
import { heroImages } from '../../../constants/heroImages';
const TrendChart = lazy(() => import('../components/TrendChart'));
const DelayReasonsChart = lazy(() => import('../components/DelayReasonsChart'));
const DriversRankingTable = lazy(() => import('../components/DriversRankingTable'));

function AnalyticsPage() {
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    to: new Date(),
  });

  const handleDateRangeChange = (newRange) => {
    setDateRange(newRange);
  };

  const handleExport = () => {
    console.log('Exportando datos...', dateRange);
  };

  const handleFilter = () => {
    console.log('Aplicando filtros...', dateRange);
  };

  return (
    <div className="space-y-8">
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

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Button variant="secondary" className="border-white/14 bg-white/8 text-white hover:bg-white/14" onClick={handleFilter}>
              <Filter size={16} strokeWidth={2.2} />
              Aplicar filtros
            </Button>
            <Button variant="secondary" className="border-white/14 bg-white/8 text-white hover:bg-white/14" onClick={handleExport}>
              <Download size={16} strokeWidth={2.2} />
              Exportar
            </Button>
          </div>
        </div>
      </section>

      <DateRangePicker value={dateRange} onChange={handleDateRangeChange} />

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-4">
        <StatCard label="Envios totales" value="12,482" icon={PackageCheck} change={12} changeLabel="vs periodo anterior" caption="Despachos consolidados del rango seleccionado." tone="blue" />
        <StatCard label="Entregas a tiempo" value="94.2%" icon={ShieldCheck} change={3.5} changeLabel="vs periodo anterior" caption="Cumplimiento sobre la promesa de servicio." tone="emerald" />
        <StatCard label="Demora promedio" value="2.4 hrs" icon={TimerReset} change={-8.2} changeLabel="vs periodo anterior" caption="Tiempo medio de desvio en eventos con incidencia." tone="amber" />
        <StatCard label="Incidencias criticas" value="14" icon={AlertTriangle} change={-25} changeLabel="vs periodo anterior" caption="Casos que activaron seguimiento prioritario." tone="violet" />
      </section>

      <Suspense fallback={<SectionLoader eyebrow="Cargando analitica" title="Preparando tendencia principal" description="Estamos procesando la comparativa entre periodos." />}>
        <TrendChart />
      </Suspense>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <Suspense fallback={<SectionLoader eyebrow="Cargando motivos" title="Analizando incidencias" description="Estamos agrupando los motivos de retraso mas relevantes." className="min-h-[28rem]" />}>
          <DelayReasonsChart />
        </Suspense>
        <Suspense fallback={<SectionLoader eyebrow="Cargando ranking" title="Preparando rendimiento del equipo" description="Estamos calculando la consistencia y eficiencia de conductores." className="min-h-[28rem]" />}>
          <DriversRankingTable />
        </Suspense>
      </section>

      <section className="rounded-[1.6rem] border border-white/70 bg-white/85 px-6 py-5 text-center shadow-[0_20px_48px_-38px_rgba(15,23,42,0.25)] backdrop-blur-xl">
        <p className="text-sm text-surface-500">
          Ultima actualizacion: {new Date().toLocaleString('es-BO', { dateStyle: 'long', timeStyle: 'short' })}
        </p>
        <p className="mt-1 text-xs text-surface-400">Los datos se actualizan automaticamente cada 5 minutos.</p>
      </section>
    </div>
  );
}

export default AnalyticsPage;
