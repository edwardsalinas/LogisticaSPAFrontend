import { Inbox } from 'lucide-react';

function DataTable({ columns, data, onRowClick, emptyMessage = 'No hay datos disponibles' }) {
  const handleRowKeyDown = (event, row) => {
    if (!onRowClick) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onRowClick(row);
    }
  };

  return (
    <div className="overflow-x-auto px-4 pb-4">
      <table className="min-w-full border-separate border-spacing-y-3">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} scope="col" className="px-4 py-3 text-left text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-surface-500">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="rounded-[1.35rem] bg-surface-50 px-6 py-12 text-center">
                <div className="mx-auto flex max-w-md flex-col items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-white text-surface-500 shadow-sm">
                    <Inbox size={20} strokeWidth={2.2} />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-surface-800">Sin resultados en esta vista</p>
                  <p className="mt-2 text-sm text-surface-500">{emptyMessage}</p>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr
                key={row.id || idx}
                className={`bg-surface-50/75 shadow-[0_10px_35px_-30px_rgba(15,23,42,0.35)] transition-all ${onRowClick ? 'cursor-pointer hover:bg-white hover:shadow-[0_18px_42px_-30px_rgba(15,23,42,0.28)] focus-within:bg-white' : ''}`}
                onClick={() => onRowClick?.(row)}
                onKeyDown={(event) => handleRowKeyDown(event, row)}
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? 'button' : undefined}
                aria-label={onRowClick ? `Abrir detalle de fila ${idx + 1}` : undefined}
              >
                {columns.map((col, colIndex) => (
                  <td
                    key={col.key}
                    className={`px-4 py-4 align-middle text-sm text-surface-700 ${colIndex === 0 ? 'rounded-l-[1.2rem]' : ''} ${colIndex === columns.length - 1 ? 'rounded-r-[1.2rem]' : ''}`}
                  >
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
