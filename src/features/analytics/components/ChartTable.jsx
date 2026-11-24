/**
 * Vista en tabla de un gráfico (la "gemela" accesible): los mismos datos, legibles con lector de pantalla y sin depender
 * del color ni del ratón. Se ofrece en todos los gráficos de Reportes.
 *
 * columns: [{ key, label, align? ('right') }]   rows: [{ [key]: valor }]
 */
function ChartTable({ caption, columns, rows, summary = 'Ver como tabla' }) {
  return (
    <details className="mt-5 rounded-xl border border-surface-200 bg-white">
      <summary className="cursor-pointer select-none rounded-xl px-4 py-3 text-sm font-medium text-primary-700 hover:bg-surface-50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-500">
        {summary}
      </summary>
      <div className="max-h-72 overflow-auto px-4 pb-4">
        <table className="w-full border-collapse text-sm tabular-nums">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`sticky top-0 border-b border-surface-200 bg-white py-2 text-xs font-semibold text-surface-600 ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id ?? i} className="border-b border-surface-100 last:border-b-0">
                {columns.map((col) => (
                  <td key={col.key} className={`py-2 text-surface-800 ${col.align === 'right' ? 'text-right' : 'text-left'}`}>
                    {row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export default ChartTable;
