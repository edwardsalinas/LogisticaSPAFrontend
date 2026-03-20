import { Inbox, Sparkles } from 'lucide-react';

function EmptyState({
  eyebrow = 'Sin resultados',
  title = 'No hay informacion disponible',
  description = 'Todavia no tenemos datos para mostrar en esta seccion.',
  action = null,
  className = '',
}) {
  return (
    <div className={`relative flex min-h-[16rem] items-center justify-center overflow-hidden rounded-[1.6rem] border border-dashed border-surface-200 bg-white/72 p-6 text-center ${className}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(19,127,236,0.08),transparent_38%)]" />
      <div className="pointer-events-none absolute -right-10 top-0 h-28 w-28 rounded-full bg-sky-200/20 blur-3xl" />
      <div className="relative">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-surface-100 text-surface-500 shadow-sm">
          <Inbox size={22} strokeWidth={2.2} />
        </div>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-surface-200 bg-white/85 px-3 py-1 text-[0.64rem] uppercase tracking-[0.2em] text-surface-500">
          <Sparkles size={12} strokeWidth={2.2} />
          {eyebrow}
        </div>
        <h3 className="mt-3 font-display text-xl font-semibold tracking-[-0.04em] text-surface-950">{title}</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-surface-500">{description}</p>
        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  );
}

export default EmptyState;
