import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const MOCK_DATA = [
  { date: '01 Mar', esteMes: 120, mesPasado: 100 },
  { date: '05 Mar', esteMes: 145, mesPasado: 110 },
  { date: '10 Mar', esteMes: 180, mesPasado: 125 },
  { date: '15 Mar', esteMes: 220, mesPasado: 140 },
  { date: '20 Mar', esteMes: 265, mesPasado: 155 },
  { date: '25 Mar', esteMes: 310, mesPasado: 170 },
  { date: '30 Mar', esteMes: 358, mesPasado: 185 },
];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  const current = payload.find((item) => item.dataKey === 'esteMes');
  const previous = payload.find((item) => item.dataKey === 'mesPasado');

  return (
    <div className="rounded-[1.2rem] border border-white/70 bg-white/96 p-4 shadow-[0_24px_48px_-30px_rgba(15,23,42,0.28)] backdrop-blur-xl">
      <p className="text-[0.64rem] font-semibold uppercase tracking-[0.18em] text-surface-500">{label}</p>
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between gap-6 text-sm">
          <span className="text-surface-600">Este mes</span>
          <span className="font-semibold text-primary-700">{current?.value}</span>
        </div>
        <div className="flex items-center justify-between gap-6 text-sm">
          <span className="text-surface-600">Mes pasado</span>
          <span className="font-semibold text-surface-700">{previous?.value}</span>
        </div>
      </div>
    </div>
  );
}

function TrendChart({ title = 'Tendencia del volumen logistico', data = MOCK_DATA }) {
  const latest = data[data.length - 1]?.esteMes || 0;
  const previous = data[data.length - 1]?.mesPasado || 0;
  const delta = previous ? Math.round(((latest - previous) / previous) * 100) : 0;

  return (
    <section className="motion-card overflow-hidden rounded-[1.8rem] border border-white/70 bg-white/90 p-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] backdrop-blur-xl">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-surface-500">Tendencia principal</p>
          <h3 className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em] text-surface-950">{title}</h3>
          <p className="mt-2 max-w-2xl text-sm text-surface-500">Comparativa entre el mes actual y el periodo anterior con lectura acumulada y referencia visual más clara.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:w-auto">
          <div className="rounded-[1.2rem] border border-surface-100 bg-surface-50 px-4 py-3">
            <p className="text-[0.62rem] uppercase tracking-[0.18em] text-surface-500">Cierre actual</p>
            <p className="mt-1 font-display text-2xl font-semibold tracking-[-0.04em] text-primary-700">{latest}</p>
          </div>
          <div className="rounded-[1.2rem] border border-surface-100 bg-surface-50 px-4 py-3">
            <p className="text-[0.62rem] uppercase tracking-[0.18em] text-surface-500">Variacion</p>
            <p className={`mt-1 font-display text-2xl font-semibold tracking-[-0.04em] ${delta >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{delta >= 0 ? '+' : ''}{delta}%</p>
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-3 text-sm">
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-2 text-sky-700"><span className="h-2.5 w-2.5 rounded-full bg-primary-500" /> Este mes</div>
        <div className="inline-flex items-center gap-2 rounded-full border border-surface-200 bg-surface-50 px-3 py-2 text-surface-700"><span className="h-2.5 w-2.5 rounded-full bg-surface-400" /> Mes pasado</div>
      </div>

      <div className="h-[320px] sm:h-[340px]" role="img" aria-label="Grafico de tendencia comparando este mes y el mes pasado">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="volumeFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#137fec" stopOpacity={0.32} />
                <stop offset="100%" stopColor="#137fec" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 10" stroke="#dbe4f0" vertical={false} />
            <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} width={42} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeDasharray: '4 6' }} />
            <Area type="monotone" dataKey="esteMes" name="Este mes" stroke="#137fec" fill="url(#volumeFill)" strokeWidth={3} activeDot={{ r: 5, fill: '#137fec', stroke: '#ffffff', strokeWidth: 2 }} />
            <Line type="monotone" dataKey="mesPasado" name="Mes pasado" stroke="#94a3b8" strokeWidth={2.2} strokeDasharray="8 6" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export default TrendChart;
