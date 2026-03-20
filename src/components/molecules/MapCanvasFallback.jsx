function MapCanvasFallback({ className = '' }) {
  return (
    <div className={`flex h-full min-h-[22rem] items-center justify-center bg-[radial-gradient(circle_at_top,rgba(11,78,162,0.08),transparent_55%)] ${className}`}>
      <div className="rounded-[1.5rem] border border-white/70 bg-white/88 px-6 py-5 text-center shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] backdrop-blur-xl">
        <p className="text-[0.64rem] uppercase tracking-[0.2em] text-surface-500">Mapa</p>
        <h3 className="mt-2 font-display text-xl font-semibold tracking-[-0.04em] text-surface-950">Preparando vista geoespacial</h3>
        <p className="mt-2 text-sm text-surface-500">Cargando capas, rutas y marcadores...</p>
      </div>
    </div>
  );
}

export default MapCanvasFallback;