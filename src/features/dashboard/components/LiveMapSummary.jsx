export default function LiveMapSummary({ stats }) {
  const tiles = [
    { label: 'En ruta', value: stats?.packagesInTransit || 0 },
    { label: 'Pendientes', value: stats?.packagesPending || 0 },
    { label: 'Críticas', value: stats?.packagesDelayed || 0 },
  ];
  const rows = [
    { label: 'Siniestros reportados', count: stats?.packagesIncident || 0, alert: 'Atención', bad: 'text-red-700', badDot: 'bg-red-500' },
    { label: 'Despachos con retraso', count: stats?.packagesDelayed || 0, alert: 'Revisar', bad: 'text-amber-700', badDot: 'bg-amber-500' },
  ];

  return (
    <article className="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm">
      <h3 className="font-display text-xl font-semibold tracking-[-0.03em] text-surface-950">Flota en la calle ahora</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-surface-600">Zonas activas, alertas y flujo operativo de un vistazo.</p>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-xl bg-surface-50 p-3">
            <p className="text-xs font-medium text-surface-600">{tile.label}</p>
            <p className="mt-1.5 font-display text-2xl font-semibold tabular-nums text-surface-950">{tile.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between rounded-xl border border-surface-200 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className={`h-2.5 w-2.5 rounded-full ${row.count > 0 ? row.badDot : 'bg-emerald-500'}`} />
              <span className="text-sm text-surface-800">{row.label}: {row.count}</span>
            </div>
            <span className={`text-xs font-semibold ${row.count > 0 ? row.bad : 'text-emerald-700'}`}>{row.count > 0 ? row.alert : 'OK'}</span>
          </div>
        ))}
      </div>
    </article>
  );
}
