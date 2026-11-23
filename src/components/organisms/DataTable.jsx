import { Inbox } from 'lucide-react';
import Skeleton from '../atoms/Skeleton';

/**
 * Tabla de datos: filas densas con divisores, cifras tabulares y encabezado legible.
 * Una columna con nowrap: true no parte su contenido en varias líneas (placas, cantidades, estados).
 * maxHeight (p. ej. "32rem"): la tabla se desplaza por dentro y el encabezado queda fijo; sin él crece con su contenido.
 */
function DataTable({ columns, data, loading = false, onRowClick, emptyMessage = 'No hay datos disponibles', maxHeight }) {
  const handleRowKeyDown = (event, row) => {
    if (!onRowClick) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onRowClick(row);
    }
  };

  const sticky = maxHeight ? 'sticky top-0 z-10' : '';

  return (
    <div className="overflow-auto px-2 pb-2 sm:px-4 sm:pb-4" style={maxHeight ? { maxHeight } : undefined}>
      <table className="min-w-full border-collapse tabular-nums">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`${sticky} whitespace-nowrap border-b border-surface-200 bg-white px-4 py-3 text-left text-xs font-semibold text-surface-600`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <tr key={`loading-${i}`} className="border-b border-surface-100">
                {columns.map((col) => (
                  <td key={`loading-${col.key}`} className="px-4 py-3.5 align-middle">
                    <Skeleton className="h-5 w-full rounded-md" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-12 text-center">
                <div className="mx-auto flex max-w-md flex-col items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-100 text-surface-500">
                    <Inbox size={20} strokeWidth={2.2} aria-hidden="true" />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-surface-800">Sin resultados en esta vista</p>
                  <p className="mt-1 text-sm text-surface-600">{emptyMessage}</p>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr
                key={row.id || idx}
                className={`border-b border-surface-100 transition-colors last:border-b-0 ${onRowClick ? 'cursor-pointer hover:bg-surface-50 focus-visible:bg-surface-50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-500' : 'hover:bg-surface-50/70'}`}
                onClick={() => onRowClick?.(row)}
                onKeyDown={(event) => handleRowKeyDown(event, row)}
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? 'button' : undefined}
                aria-label={onRowClick ? `Abrir detalle de fila ${idx + 1}` : undefined}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3.5 align-middle text-sm text-surface-700 ${col.nowrap ? 'whitespace-nowrap' : ''}`}>
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
