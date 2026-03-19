function Select({ label, name, value, onChange, options = [], placeholder, error, required = false }) {
  return (
    <div className="form-field">
      {label && (
        <label htmlFor={name} className="form-field__label">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="form-field__input"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="form-field__error">{error}</span>}
    </div>
  );
}

export default Select;
