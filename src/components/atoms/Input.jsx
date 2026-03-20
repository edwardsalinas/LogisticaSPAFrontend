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
    <div className="form-field">
      {label && (
        <label htmlFor={inputId} className="form-field__label">
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
        className={`form-field__input ${className}`}
        {...rest}
      />
      {hint && <span id={hintId} className="text-xs text-surface-500">{hint}</span>}
      {error && <span id={errorId} className="form-field__error" role="alert">{error}</span>}
    </div>
  );
}

export default Input;
