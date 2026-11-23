import { Inbox } from 'lucide-react';

function EmptyState({
  title = 'No hay información disponible',
  description = 'Todavía no tenemos datos para mostrar en esta sección.',
  action = null,
  className = '',
}) {
  return (
    <div className={`flex min-h-[16rem] items-center justify-center rounded-2xl border border-dashed border-surface-300 bg-white p-6 text-center ${className}`}>
      <div>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-100 text-surface-500">
          <Inbox size={22} strokeWidth={2.2} />
        </div>
        <h3 className="mt-4 font-display text-xl font-semibold tracking-[-0.03em] text-surface-950">{title}</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-surface-600">{description}</p>
        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  );
}

export default EmptyState;
