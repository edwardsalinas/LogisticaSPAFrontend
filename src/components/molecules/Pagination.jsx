/**
 * Pagination - Componente para paginación de tablas
 * @param {number} currentPage - Página actual (1-based)
 * @param {number} totalPages - Total de páginas
 * @param {number} totalItems - Total de elementos
 * @param {number} itemsPerPage - Elementos por página
 * @param {function} onPageChange - Callback al cambiar página
 */
function Pagination({ 
  currentPage = 1, 
  totalPages = 1, 
  totalItems = 0, 
  itemsPerPage = 10,
  onPageChange = () => {} 
}) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="pagination flex items-center justify-between gap-4">
      <p className="text-sm text-surface-500">
        Mostrando <span className="font-semibold text-surface-900">{startItem}</span> a{' '}
        <span className="font-semibold text-surface-900">{endItem}</span> de{' '}
        <span className="font-semibold text-surface-900">{totalItems}</span> resultados
      </p>
      
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="pagination__btn pagination__btn--prev px-3 py-1.5 text-sm font-medium text-surface-600 bg-white border border-surface-300 rounded-lg hover:bg-surface-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Anterior
        </button>
        
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`pagination__btn pagination__btn--page w-9 h-9 text-sm font-medium rounded-lg transition-colors ${
                  currentPage === pageNum
                    ? 'bg-primary-500 text-white'
                    : 'text-surface-600 hover:bg-surface-100'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="pagination__btn pagination__btn--next px-3 py-1.5 text-sm font-medium text-surface-600 bg-white border border-surface-300 rounded-lg hover:bg-surface-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}

export default Pagination;
