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
    <div className="rounded-[1.4rem] border border-white/70 bg-white/85 p-4 shadow-[0_18px_48px_-38px_rgba(15,23,42,0.24)] backdrop-blur-xl">
      <div className="mb-4 flex items-center gap-2 text-surface-700">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-100 text-primary-700">
          <CalendarRange size={18} strokeWidth={2.2} />
        </div>
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-surface-500">Rango de analisis</p>
          <p className="text-sm font-semibold text-surface-900">Filtra el periodo de lectura</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="flex-1">
          <label className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-surface-500">Desde</label>
          <input
            type="date"
            value={fromDate}
            onChange={handleFromChange}
            className="date-range-picker__input w-full rounded-2xl border border-surface-200 bg-surface-50 px-4 py-3 text-sm outline-none"
          />
        </div>

        <div className="flex h-11 w-11 items-center justify-center self-center rounded-2xl bg-surface-100 text-surface-500 lg:mb-0.5">
          <ArrowRight size={16} strokeWidth={2.2} />
        </div>

        <div className="flex-1">
          <label className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-surface-500">Hasta</label>
          <input
            type="date"
            value={toDate}
            onChange={handleToChange}
            className="date-range-picker__input w-full rounded-2xl border border-surface-200 bg-surface-50 px-4 py-3 text-sm outline-none"
          />
        </div>
      </div>
    </div>
  );
}

export default DateRangePicker;
