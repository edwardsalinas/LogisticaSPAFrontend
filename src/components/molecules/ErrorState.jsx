import { TriangleAlert } from 'lucide-react';

function ErrorState({
  title = 'No pudimos completar esta carga',
  description = 'Ocurrió un problema inesperado al recuperar la información.',
  action = null,
  className = '',
}) {
  return (
    <div className={`flex min-h-[16rem] items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-6 text-center ${className}`}>
      <div>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600">
          <TriangleAlert size={22} strokeWidth={2.2} />
        </div>
        <h3 className="mt-4 font-display text-xl font-semibold tracking-[-0.03em] text-surface-950">{title}</h3>
        <p className="mt-2 max-w-md text-sm text-surface-600">{description}</p>
        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  );
}

export default ErrorState;