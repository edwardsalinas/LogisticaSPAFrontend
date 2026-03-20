import { useState } from 'react';

/**
 * DateRangePicker - Selector de rango de fechas
 * @param {Object} value - { from: Date, to: Date }
 * @param {function} onChange - Callback con nuevo rango
 */
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
    <div className="date-range-picker flex items-center gap-2">
      <div className="flex items-center gap-2">
        <label className="text-sm text-surface-600">Desde:</label>
        <input
          type="date"
          value={fromDate}
          onChange={handleFromChange}
          className="date-range-picker__input px-3 py-2 border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      <span className="text-surface-400">→</span>
      <div className="flex items-center gap-2">
        <label className="text-sm text-surface-600">Hasta:</label>
        <input
          type="date"
          value={toDate}
          onChange={handleToChange}
          className="date-range-picker__input px-3 py-2 border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
    </div>
  );
}

export default DateRangePicker;
