import { useState, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import clsx from 'clsx';

function Autocomplete({
  label,
  options = [], // { value, label, subtext }
  value,
  onChange,
  placeholder = 'Buscar...',
  disabled = false,
  required = false,
  name,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = query === '' 
    ? options 
    : options.filter((opt) => 
        (opt.label || '').toLowerCase().includes(query.toLowerCase()) ||
        (opt.subtext || '').toLowerCase().includes(query.toLowerCase())
      );

  const handleSelect = (optionValue) => {
    onChange({ target: { name, value: optionValue } });
    setQuery('');
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange({ target: { name, value: '' } });
    setQuery('');
  };

  return (
    <div className="flex flex-col gap-1.5" ref={wrapperRef}>
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wider text-surface-500">
          {label} {required && <span className="text-sky-500">*</span>}
        </label>
      )}

      <div className="relative">
        {/* Toggle Button / Input display */}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={clsx(
            'flex w-full items-center justify-between rounded-xl border bg-white px-4 py-3 text-left text-sm text-surface-900 shadow-sm outline-none transition-all',
            disabled ? 'cursor-not-allowed border-surface-200 bg-surface-50 text-surface-400' : 'border-surface-200 hover:border-surface-300 focus:border-primary-400 focus:ring-4 focus:ring-primary-400/10'
          )}
        >
          <span className="truncate">
            {selectedOption ? (
              <span>{selectedOption.label} <span className="text-surface-400 font-normal">({selectedOption.subtext})</span></span>
            ) : (
              <span className="text-surface-400">{placeholder}</span>
            )}
          </span>
          <div className="flex items-center gap-1">
             {selectedOption && !disabled && (
               <div onClick={handleClear} className="p-1 hover:bg-surface-100 rounded-md transition-colors">
                  <X size={14} className="text-surface-400" />
               </div>
             )}
            <ChevronsUpDown size={16} className="text-surface-400" />
          </div>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-surface-200 bg-white shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] mb-4">
            <div className="flex items-center border-b border-surface-100 px-3">
              <Search size={16} className="text-surface-400" />
              <input
                autoFocus
                type="text"
                placeholder="Escribe para filtrar..."
                className="w-full bg-transparent px-3 py-3 text-sm text-surface-900 outline-none"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            
            <div className="max-h-60 overflow-y-auto py-2">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-3 text-sm text-surface-500 text-center">
                  No se encontraron resultados
                </div>
              ) : (
                filteredOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={clsx(
                      'flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors',
                      value === opt.value ? 'bg-primary-50 text-primary-900 font-medium' : 'text-surface-700 hover:bg-surface-50 hover:text-surface-900',
                      'gap-2'
                    )}
                  >
                    <div>
                      <p>{opt.label}</p>
                      {opt.subtext && <p className="text-xs text-surface-400 mt-0.5">{opt.subtext}</p>}
                    </div>
                    {value === opt.value && <Check size={16} className="text-primary-600 flex-shrink-0" />}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Autocomplete;
