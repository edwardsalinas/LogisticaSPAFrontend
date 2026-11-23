function InfoCard({ title, icon: Icon, children, className = '' }) {
  return (
    <section className={`motion-card rounded-2xl border border-surface-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
          {Icon ? <Icon size={18} strokeWidth={2.2} /> : null}
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-base font-semibold tracking-[-0.02em] text-surface-950 sm:text-lg">{title}</h3>
        </div>
      </div>
      <div>{children}</div>
    </section>
  );
}

export default InfoCard;
