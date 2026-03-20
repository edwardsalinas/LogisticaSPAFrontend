import { useState, useRef, useEffect } from 'react';

/**
 * ActionMenu - Menú dropdown de acciones
 * @param {Array} options - Array de opciones {label, icon, onClick, variant}
 * @param {string} align - Alineación: 'left' | 'right'
 */
function ActionMenu({ options = [], align = 'right' }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleOptionClick = (option) => {
    option.onClick?.();
    setIsOpen(false);
  };

  return (
    <div className="action-menu relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="action-menu__trigger w-9 h-9 flex items-center justify-center text-surface-400 hover:text-surface-600 hover:bg-surface-100 rounded-lg transition-colors"
      >
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
          <circle cx="12" cy="12" r="1" />
          <circle cx="12" cy="5" r="1" />
          <circle cx="12" cy="19" r="1" />
        </svg>
      </button>

      {isOpen && (
        <div
          className={`action-menu__dropdown absolute z-[1000] mt-1 w-48 bg-white rounded-lg shadow-lg border border-surface-200 overflow-hidden ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleOptionClick(option)}
              className={`action-menu__option w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-surface-50 transition-colors ${
                option.variant === 'danger' ? 'text-danger' : 'text-surface-700'
              } ${index !== options.length - 1 ? 'border-b border-surface-100' : ''}`}
            >
              {option.icon && (
                <span className="action-menu__option-icon text-lg">
                  {option.icon}
                </span>
              )}
              <span className="action-menu__option-label">{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ActionMenu;
