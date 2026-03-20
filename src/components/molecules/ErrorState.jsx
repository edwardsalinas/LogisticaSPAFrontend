import { TriangleAlert } from 'lucide-react';

function ErrorState({
  eyebrow = 'Error',
  title = 'No pudimos completar esta carga',
  description = 'Ocurrio un problema inesperado al recuperar la informacion.',
  action = null,
  className = '',
}) {
  return (
    <div className={`flex min-h-[16rem] items-center justify-center rounded-[1.6rem] border border-red-100 bg-red-50/70 p-6 text-center ${className}`}>
      <div>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-red-100 text-red-600">
          <TriangleAlert size={22} strokeWidth={2.2} />
        </div>
        <p className="mt-4 text-[0.64rem] uppercase tracking-[0.2em] text-red-500">{eyebrow}</p>
        <h3 className="mt-2 font-display text-xl font-semibold tracking-[-0.04em] text-surface-950">{title}</h3>
        <p className="mt-2 max-w-md text-sm text-surface-600">{description}</p>
        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  );
}

export default ErrorState;