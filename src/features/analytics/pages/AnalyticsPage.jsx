import { Suspense, lazy, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DateRangePicker from '../../../components/molecules/DateRangePicker';
import SectionLoader from '../../../components/molecules/SectionLoader';
import AnalyticsHero from '../components/AnalyticsHero';
import apiService from '../../../services/apiService';

const TrendChart = lazy(() => import('../components/TrendChart'));
const DelayReasonsChart = lazy(() => import('../components/DelayReasonsChart'));
const DriversRankingTable = lazy(() => import('../components/DriversRankingTable'));

const REFRESH_MS = 5 * 60 * 1000;

// El backend trabaja con días calendario (AAAA-MM-DD); se usa la fecha local del navegador
export const toYmd = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function AnalyticsPage() {
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000),
    to: new Date(),
  });

  const from = dateRange?.from ? toYmd(dateRange.from) : undefined;
  const to = dateRange?.to ? toYmd(dateRange.to) : undefined;

  const { data, isLoading, isError, error, dataUpdatedAt } = useQuery({
    queryKey: ['analytics', from, to],
    queryFn: async () => (await apiService.getAnalytics({ from, to })).data,
    enabled: Boolean(from && to),
    refetchInterval: REFRESH_MS,
    staleTime: 60_000,
  });

  const trend = (data?.trend ?? []).map((d) => ({ date: d.date, esteMes: d.actual, mesPasado: d.previous }));

  return (
    <div className="space-y-8">
      <AnalyticsHero totals={data?.totals} />

      <DateRangePicker value={dateRange} onChange={setDateRange} />

      {isError && (
        <div role="alert" className="rounded-[1.4rem] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error?.message || 'No se pudo cargar la analitica.'} Verifica el rango de fechas (maximo 92 dias) e intenta de nuevo.
        </div>
      )}

      {isLoading ? (
        <SectionLoader title="Calculando indicadores" description="Estamos procesando los envíos del rango elegido." />
      ) : (
        <>
          <Suspense fallback={<SectionLoader title="Preparando tendencia principal" description="Estamos procesando la comparativa entre periodos." />}>
            <TrendChart data={trend} total={data?.totals?.shipments ?? 0} change={data?.totals?.change ?? null} />
          </Suspense>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <Suspense fallback={<SectionLoader title="Agrupando envíos" description="Estamos contando los envíos por estado." className="min-h-[28rem]" />}>
              <DelayReasonsChart data={data?.statusBreakdown ?? []} />
            </Suspense>
            <Suspense fallback={<SectionLoader title="Preparando rendimiento del equipo" description="Estamos calculando las entregas por conductor." className="min-h-[28rem]" />}>
              <DriversRankingTable data={data?.drivers ?? []} />
            </Suspense>
          </section>
        </>
      )}

      <section className="rounded-[1.6rem] border border-white/70 bg-white/85 px-6 py-5 text-center shadow-[0_20px_48px_-38px_rgba(15,23,42,0.25)] backdrop-blur-xl">
        <p className="text-sm text-surface-500">
          Ultima actualizacion: {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleString('es-BO', { dateStyle: 'long', timeStyle: 'short' }) : '—'}
        </p>
        <p className="mt-1 text-xs text-surface-500">Los datos se actualizan automaticamente cada 5 minutos.</p>
      </section>
    </div>
  );
}

export default AnalyticsPage;
