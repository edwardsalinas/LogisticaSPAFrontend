import { CheckCircle2, TriangleAlert } from 'lucide-react';
import ChartTable from './ChartTable';

// Ocho estados no caben en un donut (la guía pide barras ordenadas a partir de seis partes): una sola barra por estado,
// de mayor a menor, todas en la serie 1 de la paleta. Solo dos colores significan algo —entregado (bien) y siniestro
// (grave)— y siempre llevan icono y texto, nunca el color solo.
const BASE = '#2a78d6';
const STATUS_MARKS = {
  entregado: { color: '#0ca30c', Icon: CheckCircle2, meaning: 'estado final correcto' },
  siniestro: { color: '#d03b3b', Icon: TriangleAlert, meaning: 'requiere atención' },
};

const markFor = (item) => {
  const key = (item.status || item.name || '').toString().toLowerCase();
  return STATUS_MARKS[key] || null;
};

const plural = (n) => (n === 1 ? 'envío' : 'envíos');

function DelayReasonsChart({ title = 'Estado de los envíos', data = [] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const max = Math.max(...data.map((item) => item.value), 1);
  const ranked = [...data].sort((a, b) => b.value - a.value);

  if (total === 0) {
    return (
      <section className="motion-card rounded-2xl border border-surface-200 bg-white p-6 shadow-sm">
        <h3 className="font-display text-xl font-semibold tracking-[-0.03em] text-surface-950">{title}</h3>
        <p className="mt-4 text-sm text-surface-600">No hay envíos registrados en el rango elegido.</p>
      </section>
    );
  }

  return (
    <section className="motion-card rounded-2xl border border-surface-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-xl font-semibold tracking-[-0.03em] text-surface-950">{title}</h3>
          <p className="mt-1 text-sm text-surface-600">Cuántos envíos del rango están en cada estado, incluidos los siniestros.</p>
        </div>
        <div className="shrink-0 rounded-xl bg-surface-50 px-4 py-3 text-right">
          <p className="text-xs font-medium text-surface-600">Total</p>
          <p className="mt-1 font-display text-2xl font-semibold text-surface-950">{total}</p>
        </div>
      </div>

      <ul className="divide-y divide-surface-100" aria-label="Envíos por estado, de mayor a menor">
        {ranked.map((item) => {
          const mark = markFor(item);
          const share = Math.round((item.value / total) * 100);
          const detail = `${item.name}: ${item.value} ${plural(item.value)} (${share} %)${mark ? `, ${mark.meaning}` : ''}`;
          const Icon = mark?.Icon;
          return (
            <li
              key={item.status || item.name}
              title={detail}
              className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)_auto] items-center gap-3 py-2.5 sm:grid-cols-[10rem_minmax(0,1fr)_6.5rem]"
            >
              <span className="flex min-w-0 items-center gap-2 text-sm text-surface-800">
                {Icon ? <Icon size={15} strokeWidth={2.2} aria-hidden="true" style={{ color: mark.color }} className="shrink-0" /> : null}
                <span className="truncate">{item.name}</span>
                {mark ? <span className="sr-only">, {mark.meaning}</span> : null}
              </span>
              <span className="block border-l border-surface-300">
                <span
                  className="block h-3 rounded-r"
                  style={{ width: `${(item.value / max) * 100}%`, minWidth: item.value > 0 ? 4 : 0, backgroundColor: mark?.color || BASE }}
                />
              </span>
              <span className="text-right text-sm tabular-nums text-surface-950">
                <strong className="font-semibold">{item.value}</strong>
                <span className="text-surface-600"> · {share}%</span>
              </span>
            </li>
          );
        })}
      </ul>

      <ChartTable
        caption="Envíos por estado, con su porcentaje del total"
        columns={[
          { key: 'name', label: 'Estado' },
          { key: 'value', label: 'Envíos', align: 'right' },
          { key: 'share', label: 'Del total', align: 'right' },
        ]}
        rows={ranked.map((item) => ({ id: item.status || item.name, name: item.name, value: item.value, share: `${Math.round((item.value / total) * 100)} %` }))}
      />
    </section>
  );
}

export default DelayReasonsChart;
