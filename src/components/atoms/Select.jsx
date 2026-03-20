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
    <div className="form-field">
      {label && (
        <label htmlFor={selectId} className="form-field__label">
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
          className="form-field__input appearance-none pr-11"
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
      {error && <span id={errorId} className="form-field__error" role="alert">{error}</span>}
    </div>
  );
}

export default Select;
