import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendingDown, TrendingUp } from 'lucide-react';
import ChartTable from './ChartTable';

// Colores validados con la guía de visualización (scripts/validate_palette.js sobre fondo blanco):
// serie 1 de la paleta documentada y un gris de contexto para la comparación (forma "énfasis").
// Pasan separación para daltonismo (ΔE 15,9), piso de visión normal (17,8) y contraste ≥ 3:1.
const CURRENT = '#2a78d6';
const PREVIOUS = '#898781';
const GRID = '#e1e0d9';
const AXIS_LINE = '#c3c2b7';
const INK_SECONDARY = '#52514e';

// Números con coma decimal (es-BO): 18,4 y no 18.4
const fmt = (n) => Number(n).toLocaleString('es-BO');

function LineKey({ color, label }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-surface-700">
      <span aria-hidden="true" className="h-0.5 w-5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const current = payload.find((item) => item.dataKey === 'esteMes');
  const previous = payload.find((item) => item.dataKey === 'mesPasado');

  return (
    <div className="rounded-xl border border-surface-200 bg-white p-3 shadow-md">
      <p className="text-xs font-medium text-surface-600">{label}</p>
      <div className="mt-2 space-y-1.5">
        <div className="flex items-center justify-between gap-6 text-sm">
          <span className="inline-flex items-center gap-2 text-surface-700"><span aria-hidden="true" className="h-0.5 w-4 rounded-full" style={{ backgroundColor: CURRENT }} />Este período</span>
          <span className="font-semibold text-surface-950">{current?.value ?? '—'}</span>
        </div>
        <div className="flex items-center justify-between gap-6 text-sm">
          <span className="inline-flex items-center gap-2 text-surface-700"><span aria-hidden="true" className="h-0.5 w-4 rounded-full" style={{ backgroundColor: PREVIOUS }} />Período anterior</span>
          <span className="font-semibold text-surface-950">{previous?.value ?? '—'}</span>
        </div>
      </div>
    </div>
  );
}

function TrendChart({ title = 'Tendencia del volumen logístico', data = [], total = 0, change = null }) {
  // Punto final de la serie actual: marcador de 8 px con anillo de 2 px del color de la superficie
  const renderEndDot = (props) => {
    const { cx, cy, index } = props;
    if (index !== data.length - 1 || cx == null || cy == null) return <g key={`d-${index}`} />;
    return <circle key={`d-${index}`} cx={cx} cy={cy} r={4} fill={CURRENT} stroke="#ffffff" strokeWidth={2} />;
  };

  const resumen = change === null
    ? 'sin período anterior con envíos para comparar'
    : `${change >= 0 ? '+' : ''}${fmt(change)}% frente al período anterior`;

  return (
    <section className="motion-card overflow-hidden rounded-2xl border border-surface-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="font-display text-xl font-semibold tracking-[-0.03em] text-surface-950">{title}</h3>
          <p className="mt-1 max-w-2xl text-sm text-surface-600">Paquetes registrados por día en el rango elegido, frente a un período anterior de la misma duración.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:w-auto">
          <div className="rounded-xl bg-surface-50 px-4 py-3">
            <p className="text-xs font-medium text-surface-600">Total del período</p>
            <p className="mt-1 font-display text-2xl font-semibold text-surface-950">{total}</p>
          </div>
          <div className="rounded-xl bg-surface-50 px-4 py-3">
            <p className="text-xs font-medium text-surface-600">Variación</p>
            {change === null ? (
              <p className="mt-1 font-display text-2xl font-semibold text-surface-600" title="El período anterior no tiene envíos para comparar">—</p>
            ) : (
              <p className={`mt-1 inline-flex items-center gap-1.5 font-display text-2xl font-semibold ${change >= 0 ? 'text-[#006300]' : 'text-red-700'}`}>
                {change >= 0 ? <TrendingUp size={20} aria-hidden="true" /> : <TrendingDown size={20} aria-hidden="true" />}
                {change >= 0 ? '+' : ''}{fmt(change)}%
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-x-6 gap-y-2" aria-label="Leyenda del gráfico">
        <LineKey color={CURRENT} label="Este período" />
        <LineKey color={PREVIOUS} label="Período anterior" />
      </div>

      <div
        className="h-[320px] sm:h-[340px]"
        role="img"
        aria-label={`Gráfico de líneas con los paquetes registrados por día: este período ${total}, ${resumen}. Los valores día por día están en la tabla de abajo.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
            <CartesianGrid stroke={GRID} strokeWidth={1} vertical={false} />
            <XAxis dataKey="date" stroke={AXIS_LINE} tick={{ fill: INK_SECONDARY, fontSize: 12 }} tickLine={false} axisLine={{ stroke: AXIS_LINE }} tickMargin={8} />
            <YAxis tick={{ fill: INK_SECONDARY, fontSize: 12 }} tickLine={false} axisLine={false} width={42} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: AXIS_LINE, strokeWidth: 1 }} />
            <Area
              type="monotone"
              dataKey="esteMes"
              name="Este período"
              stroke={CURRENT}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill={CURRENT}
              fillOpacity={0.1}
              dot={renderEndDot}
              activeDot={{ r: 5, fill: CURRENT, stroke: '#ffffff', strokeWidth: 2 }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="mesPasado"
              name="Período anterior"
              stroke={PREVIOUS}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={{ r: 5, fill: PREVIOUS, stroke: '#ffffff', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <ChartTable
        caption="Paquetes registrados por día: este período y el período anterior"
        columns={[
          { key: 'date', label: 'Día' },
          { key: 'esteMes', label: 'Este período', align: 'right' },
          { key: 'mesPasado', label: 'Período anterior', align: 'right' },
        ]}
        rows={data.map((d) => ({ date: d.date, esteMes: d.esteMes ?? '—', mesPasado: d.mesPasado ?? '—' }))}
      />
    </section>
  );
}

export default TrendChart;
