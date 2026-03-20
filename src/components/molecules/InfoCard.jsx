function InfoCard({ title, icon: Icon, eyebrow = 'Detalle', children, className = '' }) {
  return (
    <section className={`motion-card rounded-[1.35rem] sm:rounded-[1.5rem] border border-white/70 bg-white/88 p-4 sm:p-5 shadow-[0_22px_50px_-40px_rgba(15,23,42,0.28)] backdrop-blur-xl ${className}`}>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-primary-100 text-primary-700">
          {Icon ? <Icon size={18} strokeWidth={2.2} /> : null}
        </div>
        <div className="min-w-0">
          <p className="text-[0.62rem] uppercase tracking-[0.2em] text-surface-500">{eyebrow}</p>
          <h3 className="mt-1 font-display text-base sm:text-lg font-semibold tracking-[-0.03em] text-surface-950">{title}</h3>
        </div>
      </div>
      <div>{children}</div>
    </section>
  );
}

export default InfoCard;
