import { useCallback, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Button from '../atoms/Button';
import Modal from './Modal';

/**
 * Confirmación propia, en lugar de window.confirm (que bloquea la página, no se puede estilar y no explica las consecuencias).
 * `tone="danger"` para acciones destructivas: el botón de confirmar se pinta de rojo.
 */
export default function ConfirmDialog({ isOpen, title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', tone = 'default', busy = false, onConfirm, onCancel }) {
  return (
    <Modal isOpen={isOpen} onClose={busy ? undefined : onCancel} title={title}>
      <div className="flex items-start gap-3">
        {tone === 'danger' && (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <AlertTriangle size={20} aria-hidden="true" />
          </span>
        )}
        <p className="pt-1 text-sm leading-relaxed text-surface-700">{message}</p>
      </div>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={busy} className="min-h-11">{cancelLabel}</Button>
        <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} disabled={busy} className="min-h-11">
          {busy ? 'Procesando…' : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

/**
 * Hook para pedir confirmación como si fuera `await confirm(...)`:
 *
 *   const [ask, confirmDialog] = useConfirm();
 *   if (!(await ask({ title: 'Eliminar ruta', message: '…', confirmLabel: 'Eliminar', tone: 'danger' }))) return;
 *   ...   // y en el JSX: {confirmDialog}
 */
export function useConfirm() {
  const [options, setOptions] = useState(null);
  const resolver = useRef(null);

  const ask = useCallback((opts) => new Promise((resolve) => {
    resolver.current = resolve;
    setOptions(opts);
  }), []);

  const close = (answer) => {
    resolver.current?.(answer);
    resolver.current = null;
    setOptions(null);
  };

  const dialog = (
    <ConfirmDialog
      isOpen={!!options}
      title={options?.title}
      message={options?.message}
      confirmLabel={options?.confirmLabel}
      cancelLabel={options?.cancelLabel}
      tone={options?.tone}
      onConfirm={() => close(true)}
      onCancel={() => close(false)}
    />
  );

  return [ask, dialog];
}
