import { X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function Modal({ isOpen, onClose, title, children, footer }) {
  const titleId = useId();
  const modalRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedRef.current = document.activeElement;

    const focusables = modalRef.current?.querySelectorAll(FOCUSABLE_SELECTOR);
    const firstFocusable = focusables?.[0];
    firstFocusable?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
        return;
      }

      if (event.key !== 'Tab' || !modalRef.current) return;

      const elements = Array.from(modalRef.current.querySelectorAll(FOCUSABLE_SELECTOR));
      if (elements.length === 0) return;

      const first = elements[0];
      const last = elements[elements.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocusedRef.current?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[4px]" onClick={onClose}>
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-[1.8rem] border border-white/70 bg-white/94 shadow-[0_30px_80px_-38px_rgba(15,23,42,0.35)] backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-surface-100 px-6 py-5 sm:px-7">
          <div>
            <p className="text-[0.64rem] uppercase tracking-[0.2em] text-surface-500">Panel contextual</p>
            <h3 id={titleId} className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em] text-surface-950">{title}</h3>
          </div>
          <button
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-surface-200 bg-white text-surface-500 transition-colors hover:bg-surface-50 hover:text-surface-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            <X size={18} strokeWidth={2.2} />
          </button>
        </div>
        <div className="max-h-[calc(90vh-8rem)] overflow-y-auto px-6 py-6 sm:px-7">{children}</div>
        {footer && <div className="border-t border-surface-100 px-6 py-4 sm:px-7">{footer}</div>}
      </div>
    </div>
  );
}

export default Modal;
