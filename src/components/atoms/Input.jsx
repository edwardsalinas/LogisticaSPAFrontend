function Input({ label, name, type = 'text', value, onChange, placeholder, error, required = false, ...rest }) {
  return (
    <div className="form-field">
      {label && (
        <label htmlFor={name} className="form-field__label">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="form-field__input"
        {...rest}
      />
      {error && <span className="form-field__error">{error}</span>}
    </div>
  );
}

export default Input;
