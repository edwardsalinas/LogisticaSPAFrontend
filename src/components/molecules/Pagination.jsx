import { ChevronLeft, ChevronRight } from 'lucide-react';

function Pagination({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange = () => {},
}) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
    if (totalPages <= 5) return i + 1;
    if (currentPage <= 3) return i + 1;
    if (currentPage >= totalPages - 2) return totalPages - 4 + i;
    return currentPage - 2 + i;
  });

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-surface-500">
        Mostrando <span className="font-semibold text-surface-900">{startItem}</span> a{' '}
        <span className="font-semibold text-surface-900">{endItem}</span> de{' '}
        <span className="font-semibold text-surface-900">{totalItems}</span> resultados
      </p>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="inline-flex h-10 max-sm:min-h-11 items-center gap-2 rounded-xl border border-surface-200 bg-white px-3 text-sm font-semibold text-surface-600 transition-colors hover:bg-surface-50 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ChevronLeft size={16} strokeWidth={2.2} />
          Anterior
        </button>

        <div className="flex items-center gap-1">
          {pages.map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              aria-label={`Página ${pageNum}`}
              aria-current={currentPage === pageNum ? 'page' : undefined}
              className={`flex h-10 w-10 max-sm:h-11 max-sm:w-11 items-center justify-center rounded-xl text-sm font-semibold transition-all ${
                currentPage === pageNum
                  ? 'bg-brand-gradient text-white shadow-[0_14px_32px_-20px_rgba(19,127,236,0.7)]'
                  : 'border border-transparent text-surface-600 hover:border-surface-200 hover:bg-white'
              }`}
            >
              {pageNum}
            </button>
          ))}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="inline-flex h-10 max-sm:min-h-11 items-center gap-2 rounded-xl border border-surface-200 bg-white px-3 text-sm font-semibold text-surface-600 transition-colors hover:bg-surface-50 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Siguiente
          <ChevronRight size={16} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}

export default Pagination;
