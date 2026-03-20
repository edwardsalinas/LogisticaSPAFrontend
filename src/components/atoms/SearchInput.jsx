/**
 * SearchInput - Componente atómico para búsqueda con icono
 * @param {string} value - Valor del input
 * @param {function} onChange - Callback cuando cambia el valor
 * @param {string} placeholder - Texto placeholder
 * @param {boolean} disabled - Estado deshabilitado
 */
function SearchInput({ 
  value = '', 
  onChange = () => {}, 
  placeholder = 'Buscar...', 
  disabled = false 
}) {
  return (
    <div className="search-input relative">
      <div className="search-input__icon absolute left-3 top-1/2 -translate-y-1/2 text-surface-400">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </div>
      <input
        type="text"
        className="search-input__field w-full pl-10 pr-4 py-2 border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}

export default SearchInput;
