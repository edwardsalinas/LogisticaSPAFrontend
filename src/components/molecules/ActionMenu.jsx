import {
  Eye,
  MoreHorizontal,
  Pencil,
  Power,
  Trash2,
  UserRound,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const iconMap = {
  ver: Eye,
  perfil: UserRound,
  edit: Pencil,
  editar: Pencil,
  delete: Trash2,
  eliminar: Trash2,
  toggle: Power,
};

function resolveIcon(icon) {
  if (!icon) return null;
  if (typeof icon === 'function') return icon;
  if (typeof icon === 'string') return iconMap[icon.toLowerCase()] || MoreHorizontal;
  return null;
}

function ActionMenu({ options = [], align = 'right' }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

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
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-surface-200 bg-white text-surface-500 transition-colors hover:bg-surface-50 hover:text-surface-700"
      >
        <MoreHorizontal size={18} strokeWidth={2.2} />
      </button>

      {isOpen && (
        <div
          className={`absolute z-[1000] mt-2 w-52 overflow-hidden rounded-[1.2rem] border border-surface-200 bg-white/95 shadow-[0_22px_50px_-30px_rgba(15,23,42,0.35)] backdrop-blur-xl ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {options.map((option, index) => {
            const Icon = resolveIcon(option.icon);
            const danger = option.variant === 'danger';

            return (
              <button
                key={index}
                onClick={() => handleOptionClick(option)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-surface-50 ${
                  danger ? 'text-red-600' : 'text-surface-700'
                } ${index !== options.length - 1 ? 'border-b border-surface-100' : ''}`}
              >
                <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${danger ? 'bg-red-50 text-red-600' : 'bg-surface-100 text-surface-600'}`}>
                  {Icon ? <Icon size={15} strokeWidth={2.2} /> : <MoreHorizontal size={15} strokeWidth={2.2} />}
                </span>
                <span className="flex-1 text-left font-medium">{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ActionMenu;
