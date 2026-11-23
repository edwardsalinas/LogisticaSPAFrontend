import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  return (
    <div className="rounded-[1.2rem] border border-white/70 bg-white/96 p-4 shadow-[0_24px_48px_-30px_rgba(15,23,42,0.28)] backdrop-blur-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-surface-500">Estado</p>
      <p className="mt-2 text-sm font-semibold text-surface-900">{item.name}</p>
      <p className="mt-1 text-sm text-surface-600">{item.value} {item.value === 1 ? 'envío' : 'envíos'}</p>
    </div>
  );
}

function DelayReasonsChart({ title = 'Estado de los envíos', data = [] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const topReason = data[0];

  if (total === 0) {
    return (
      <section className="motion-card rounded-[1.8rem] border border-white/70 bg-white/88 p-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] backdrop-blur-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-surface-500">Envíos</p>
        <h3 className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em] text-surface-950">{title}</h3>
        <p className="mt-6 text-sm text-surface-500">No hay envíos registrados en el rango elegido.</p>
      </section>
    );
  }

  return (
    <section className="motion-card rounded-[1.8rem] border border-white/70 bg-white/88 p-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] backdrop-blur-xl">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-surface-500">Envíos</p>
          <h3 className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em] text-surface-950">{title}</h3>
          <p className="mt-2 text-sm text-surface-500">Cuántos envíos del rango están en cada estado, incluidos los siniestros.</p>
        </div>
        <div className="rounded-2xl border border-surface-100 bg-surface-50 px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.18em] text-surface-500">Total</p>
          <p className="mt-1 font-display text-2xl font-semibold tracking-[-0.04em] text-surface-950">{total}</p>
        </div>
      </div>

      <div className="mb-5 rounded-[1.3rem] border border-surface-100 bg-[linear-gradient(135deg,rgba(11,78,162,0.06),rgba(255,255,255,0.8))] px-4 py-4">
        <p className="text-xs uppercase tracking-[0.18em] text-surface-500">Estado mas frecuente</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: topReason.color }} /><span className="text-sm font-semibold text-surface-900">{topReason.name}</span></div>
          <span className="text-sm font-semibold text-surface-600">{Math.round((topReason.value / total) * 100)}%</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-center">
        <div className="relative h-[260px]" role="img" aria-label="Gráfico circular con la distribución de los envíos por estado">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-full border border-surface-100 bg-white/85 px-5 py-4 text-center shadow-sm backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-surface-500">Envíos</p>
              <p className="mt-1 font-display text-2xl font-semibold tracking-[-0.04em] text-surface-950">{total}</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={74} outerRadius={108} paddingAngle={4} dataKey="value" stroke="rgba(255,255,255,0.9)" strokeWidth={4}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-3">
          {data.map((item) => (
            <div key={item.name} className="rounded-[1.2rem] border border-surface-100 bg-surface-50 px-4 py-3 transition-colors hover:bg-white">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm font-semibold text-surface-800">{item.name}</span>
                </div>
                <span className="text-sm font-semibold text-surface-500">{item.value}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full" style={{ width: `${(item.value / total) * 100}%`, backgroundColor: item.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default DelayReasonsChart;
