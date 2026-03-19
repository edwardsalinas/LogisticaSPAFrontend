function DataTable({ columns, data, onRowClick }) {
  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead className="data-table__header">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="data-table__th">{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="data-table__td text-center text-surface-400 py-8">
                No hay datos disponibles
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr
                key={row.id || idx}
                className="data-table__row"
                onClick={() => onRowClick?.(row)}
                style={{ cursor: onRowClick ? 'pointer' : 'default' }}
              >
                {columns.map((col) => (
                  <td key={col.key} className="data-table__td">
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
