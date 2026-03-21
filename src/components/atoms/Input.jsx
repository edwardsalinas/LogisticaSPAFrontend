import { useId } from 'react';

function Input({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  required = false,
  className = '',
  hint = '',
  ...rest
}) {
  const generatedId = useId();
  const inputId = name || generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-surface-700">
          {label} {required && <span className="text-danger" aria-hidden="true">*</span>}
        </label>
      )}
      <input
        id={inputId}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        className={`w-full min-h-12 rounded-[14px] border border-surface-200 bg-white px-3.5 py-3 text-sm text-surface-900 outline-none transition-all duration-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 ${className}`}
        {...rest}
      />
      {hint && <span id={hintId} className="text-xs text-surface-500">{hint}</span>}
      {error && <span id={errorId} className="text-xs text-danger" role="alert">{error}</span>}
    </div>
  );
}

export default Input;
