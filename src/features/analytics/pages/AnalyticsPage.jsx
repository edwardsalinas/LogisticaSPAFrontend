import { Suspense, lazy, useState } from 'react';
import { takeRequestedField, useFieldRequests } from '../../ai-chat/pageContext';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
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

// «YYYY-MM-DD» → fecha local (sin el corrimiento de zona horaria de new Date('2026-11-01'))
const fromYmd = (ymd) => { const [y, m, d] = String(ymd).split('-').map(Number); return new Date(y, m - 1, d); };
const rangeFromAsk = (ask) => (ask?.from && ask?.to ? { from: fromYmd(ask.from), to: fromYmd(ask.to) } : null);

function AnalyticsPage() {
  const [dateRange, setDateRange] = useState(() => rangeFromAsk(takeRequestedField('analytics', 'range')) ?? {
    from: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000),
    to: new Date(),
  });
  useFieldRequests('analytics', { range: (v) => { const r = rangeFromAsk(v); if (r) setDateRange(r); } }); // «muéstrame el último mes» (Logi)

  const from = dateRange?.from ? toYmd(dateRange.from) : undefined;
  const to = dateRange?.to ? toYmd(dateRange.to) : undefined;

  const { data, isLoading, isFetching, isError, error, dataUpdatedAt } = useQuery({
    queryKey: ['analytics', from, to],
    queryFn: async () => (await apiService.getAnalytics({ from, to })).data,
    enabled: Boolean(from && to),
    refetchInterval: REFRESH_MS,
    staleTime: 60_000,
    // al cambiar el rango se conserva lo que ya se veía (atenuado) en lugar de parpadear con un esqueleto
    placeholderData: keepPreviousData,
  });

  const trend = (data?.trend ?? []).map((d) => ({ date: d.date, esteMes: d.actual, mesPasado: d.previous }));

  return (
    <div className="space-y-8">
      <AnalyticsHero totals={data?.totals} />

      <DateRangePicker value={dateRange} onChange={setDateRange} />

      {isError && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error?.message || 'No se pudo cargar la analítica.'} Verifica el rango de fechas (máximo 92 días) e intenta de nuevo.
        </div>
      )}

      {isLoading ? (
        <SectionLoader title="Calculando indicadores" description="Estamos procesando los envíos del rango elegido." />
      ) : (
        <div className={`space-y-8 transition-opacity ${isFetching ? 'opacity-60' : ''}`} aria-busy={isFetching}>
          <Suspense fallback={<SectionLoader title="Preparando tendencia principal" description="Estamos procesando la comparativa entre períodos." />}>
            <TrendChart data={trend} total={data?.totals?.shipments ?? 0} change={data?.totals?.change ?? null} />
          </Suspense>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <Suspense fallback={<SectionLoader title="Agrupando envíos" description="Estamos contando los envíos por estado." className="min-h-[28rem]" />}>
              <DelayReasonsChart data={data?.statusBreakdown ?? []} />
            </Suspense>
            <Suspense fallback={<SectionLoader title="Preparando rendimiento del equipo" description="Estamos calculando las entregas por conductor." className="min-h-[28rem]" />}>
              <DriversRankingTable data={data?.drivers ?? []} />
            </Suspense>
          </section>
        </div>
      )}

      <section className="px-2 text-center">
        <p className="text-sm text-surface-600">
          Última actualización: {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleString('es-BO', { dateStyle: 'long', timeStyle: 'short' }) : '—'}
        </p>
        <p className="mt-1 text-xs text-surface-600">Los datos se actualizan automáticamente cada 5 minutos.</p>
      </section>
    </div>
  );
}

export default AnalyticsPage;
