import { ArrowRight, CalendarRange } from 'lucide-react';
import { useState } from 'react';

function DateRangePicker({ value = { from: null, to: null }, onChange }) {
  const [fromDate, setFromDate] = useState(value.from ? formatDate(value.from) : '');
  const [toDate, setToDate] = useState(value.to ? formatDate(value.to) : '');

  function formatDate(date) {
    if (!date) return '';
    return new Date(date).toISOString().split('T')[0];
  }

  const handleFromChange = (e) => {
    const newFrom = new Date(e.target.value);
    setFromDate(e.target.value);
    onChange?.({ from: newFrom, to: value.to || new Date() });
  };

  const handleToChange = (e) => {
    const newTo = new Date(e.target.value);
    setToDate(e.target.value);
    onChange?.({ from: value.from || new Date(), to: newTo });
  };

  return (
    <div className="rounded-2xl border border-surface-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-surface-700">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
          <CalendarRange size={18} strokeWidth={2.2} />
        </div>
        <div>
          <p className="text-sm font-semibold text-surface-900">Período de lectura</p>
          <p className="text-xs text-surface-600">Filtra los gráficos por rango de fechas</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="flex-1">
          <label htmlFor="rango-desde" className="mb-1.5 block text-sm font-medium text-surface-700">Desde</label>
          <input
            id="rango-desde"
            type="date"
            value={fromDate}
            onChange={handleFromChange}
            className="date-range-picker__input w-full rounded-xl border border-surface-200 bg-surface-50 px-4 py-3 text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10"
          />
        </div>

        <div className="flex h-11 w-11 items-center justify-center self-center rounded-xl bg-surface-100 text-surface-600 lg:mb-0.5">
          <ArrowRight size={16} strokeWidth={2.2} />
        </div>

        <div className="flex-1">
          <label htmlFor="rango-hasta" className="mb-1.5 block text-sm font-medium text-surface-700">Hasta</label>
          <input
            id="rango-hasta"
            type="date"
            value={toDate}
            onChange={handleToChange}
            className="date-range-picker__input w-full rounded-xl border border-surface-200 bg-surface-50 px-4 py-3 text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10"
          />
        </div>
      </div>
    </div>
  );
}

export default DateRangePicker;
