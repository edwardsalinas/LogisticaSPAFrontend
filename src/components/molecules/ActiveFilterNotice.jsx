import { Filter, X } from 'lucide-react';

/**
 * Aviso de que una lista está filtrada. Una lista filtrada sin avisarlo parece «perder» datos: la persona busca algo que sí existe y no lo
 * ve. Se muestra siempre que haya un filtro puesto, con el botón para quitarlo; `children` puede explicar qué más hay fuera del filtro.
 */
export default function ActiveFilterNotice({ label, onClear, children = null }) {
  return (
    <div role="status" data-testid="filtro-activo" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-primary-200 bg-primary-50 px-4 py-2 text-sm text-primary-900">
      <Filter size={15} aria-hidden="true" className="shrink-0" />
      <span>Filtrando por <strong className="font-semibold">«{label}»</strong></span>
      {children}
      <button
        type="button"
        onClick={onClear}
        className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 font-semibold text-primary-700 hover:bg-primary-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
      >
        <X size={14} aria-hidden="true" /> Quitar filtro
      </button>
    </div>
  );
}
