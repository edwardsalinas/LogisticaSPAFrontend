/**
 * MapLegend - Leyenda de estados para mapa de rutas
 */
function MapLegend() {
  const items = [
    { label: 'En hora', count: 18, color: 'bg-success' },
    { label: 'Retraso', count: 4, color: 'bg-danger' },
    { label: 'Alerta', count: 2, color: 'bg-warning' },
  ];

  return (
    <div className="map-legend absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3">
      <div className="flex items-center gap-4">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${item.color}`} />
            <span className="text-xs font-medium text-surface-600">
              {item.label}: {item.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MapLegend;
