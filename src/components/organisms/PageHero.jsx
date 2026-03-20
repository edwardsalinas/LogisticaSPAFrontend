function PageHero({
  eyebrow,
  icon: Icon,
  title,
  description,
  imageUrl,
  imageAlt,
  actions,
  aside,
  className = '',
}) {
  return (
    <section className={`relative overflow-hidden rounded-[1.7rem] border border-white/70 shadow-[0_28px_80px_-48px_rgba(2,36,72,0.7)] sm:rounded-[2rem] ${className}`}>
      <div className="absolute inset-0">
        <img src={imageUrl} alt={imageAlt} className="h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(6,17,31,0.94)_0%,rgba(11,29,52,0.84)_38%,rgba(11,29,52,0.34)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.18),transparent_34%)]" />
      </div>

      <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)] lg:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-sky-100/90 backdrop-blur">
            {Icon ? <Icon size={14} strokeWidth={2.2} /> : null}
            {eyebrow}
          </div>
          <h1 className="mt-5 max-w-3xl font-display text-[clamp(2rem,4.8vw,4.15rem)] font-semibold tracking-[-0.06em] text-white">{title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-200 sm:text-base">{description}</p>
        </div>

        {(actions || aside) && (
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            {actions}
            {aside}
          </div>
        )}
      </div>
    </section>
  );
}

export default PageHero;