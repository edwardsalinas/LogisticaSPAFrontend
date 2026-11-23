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

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  const current = payload.find((item) => item.dataKey === 'esteMes');
  const previous = payload.find((item) => item.dataKey === 'mesPasado');

  return (
    <div className="rounded-[1.2rem] border border-white/70 bg-white/96 p-4 shadow-[0_24px_48px_-30px_rgba(15,23,42,0.28)] backdrop-blur-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-surface-500">{label}</p>
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between gap-6 text-sm">
          <span className="text-surface-600">Este período</span>
          <span className="font-semibold text-primary-700">{current?.value}</span>
        </div>
        <div className="flex items-center justify-between gap-6 text-sm">
          <span className="text-surface-600">Período anterior</span>
          <span className="font-semibold text-surface-700">{previous?.value}</span>
        </div>
      </div>
    </div>
  );
}

function TrendChart({ title = 'Tendencia del volumen logístico', data = [], total = 0, change = null }) {
  return (
    <section className="motion-card overflow-hidden rounded-[1.8rem] border border-white/70 bg-white/90 p-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] backdrop-blur-xl">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-surface-500">Tendencia principal</p>
          <h3 className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em] text-surface-950">{title}</h3>
          <p className="mt-2 max-w-2xl text-sm text-surface-500">Paquetes registrados por día en el rango elegido, frente a un período anterior de la misma duración.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:w-auto">
          <div className="rounded-[1.2rem] border border-surface-100 bg-surface-50 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-surface-500">Total del período</p>
            <p className="mt-1 font-display text-2xl font-semibold tracking-[-0.04em] text-primary-700">{total}</p>
          </div>
          <div className="rounded-[1.2rem] border border-surface-100 bg-surface-50 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-surface-500">Variación</p>
            {change === null ? (
              <p className="mt-1 font-display text-2xl font-semibold tracking-[-0.04em] text-surface-500" title="El período anterior no tiene envíos para comparar">—</p>
            ) : (
              <p className={`mt-1 font-display text-2xl font-semibold tracking-[-0.04em] ${change >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{change}%</p>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-3 text-sm">
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-2 text-sky-700"><span className="h-2.5 w-2.5 rounded-full bg-primary-500" /> Este período</div>
        <div className="inline-flex items-center gap-2 rounded-full border border-surface-200 bg-surface-50 px-3 py-2 text-surface-700"><span className="h-2.5 w-2.5 rounded-full bg-surface-400" /> Período anterior</div>
      </div>

      <div className="h-[320px] sm:h-[340px]" role="img" aria-label="Gráfico de tendencia comparando este período y el período anterior">
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
            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} width={42} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeDasharray: '4 6' }} />
            <Area type="monotone" dataKey="esteMes" name="Este período" stroke="#137fec" fill="url(#volumeFill)" strokeWidth={3} activeDot={{ r: 5, fill: '#137fec', stroke: '#ffffff', strokeWidth: 2 }} />
            <Line type="monotone" dataKey="mesPasado" name="Período anterior" stroke="#94a3b8" strokeWidth={2.2} strokeDasharray="8 6" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export default TrendChart;
