import { Search } from 'lucide-react';
import { useId } from 'react';

function SearchInput({
  value = '',
  onChange = () => {},
  placeholder = 'Buscar...',
  disabled = false,
  className = '',
  ariaLabel = 'Buscar',
  name,
}) {
  const generatedId = useId();
  const inputId = name || generatedId;

  return (
    <div className={`relative ${className}`}>
      <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-surface-400" aria-hidden="true">
        <Search size={17} strokeWidth={2.2} />
      </div>
      <input
        id={inputId}
        name={name}
        type="search"
        className="w-full min-h-12 rounded-2xl border border-surface-200 bg-white/90 pl-11 pr-4 text-sm text-surface-900 outline-none backdrop-blur-sm transition-all duration-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 disabled:cursor-not-allowed disabled:opacity-50"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        aria-label={ariaLabel}
      />
    </div>
  );
}

export default SearchInput;
