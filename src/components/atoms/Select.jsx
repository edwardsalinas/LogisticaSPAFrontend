import { ChevronDown } from 'lucide-react';
import { useId } from 'react';

function Select({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder,
  error,
  required = false,
  hint = '',
}) {
  const generatedId = useId();
  const selectId = name || generatedId;
  const errorId = `${selectId}-error`;
  const hintId = `${selectId}-hint`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-surface-700">
          {label} {required && <span className="text-danger" aria-hidden="true">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className="w-full min-h-12 appearance-none rounded-[14px] border border-surface-200 bg-white px-3.5 py-3 pr-11 text-sm text-surface-900 outline-none transition-all duration-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10"
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-surface-400" aria-hidden="true">
          <ChevronDown size={16} strokeWidth={2.2} />
        </div>
      </div>
      {hint && <span id={hintId} className="text-xs text-surface-500">{hint}</span>}
      {error && <span id={errorId} className="text-xs text-danger" role="alert">{error}</span>}
    </div>
  );
}

export default Select;
