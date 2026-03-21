import { Suspense, lazy, useState } from 'react';
import DateRangePicker from '../../../components/molecules/DateRangePicker';
import SectionLoader from '../../../components/molecules/SectionLoader';
import AnalyticsHero from '../components/AnalyticsHero';

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

  return (
    <div className="space-y-8">
      <AnalyticsHero />

      <DateRangePicker value={dateRange} onChange={handleDateRangeChange} />

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
