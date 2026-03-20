function Skeleton({ className = '' }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-surface-200/80 ${className}`} aria-hidden="true">
      <div className="absolute inset-0 -translate-x-full animate-[skeleton-shimmer_1.6s_infinite] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.78),transparent)]" />
    </div>
  );
}

export default Skeleton;