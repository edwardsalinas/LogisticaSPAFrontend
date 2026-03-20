function Badge({ children, variant = 'neutral', size = 'md', dot = false, className = '' }) {
  const variants = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
    danger: 'border-red-200 bg-red-50 text-red-700',
    info: 'border-sky-200 bg-sky-50 text-sky-700',
    neutral: 'border-slate-200 bg-slate-50 text-slate-600',
  };

  const dotVariants = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    info: 'bg-sky-500',
    neutral: 'bg-slate-400',
  };

  const sizes = {
    sm: 'px-2.5 py-1 text-[0.62rem]',
    md: 'px-3 py-1.5 text-[0.68rem]',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold uppercase tracking-[0.12em] ${variants[variant] || variants.neutral} ${sizes[size] || sizes.md} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotVariants[variant] || dotVariants.neutral}`} />}
      {children}
    </span>
  );
}

export default Badge;
