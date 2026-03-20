import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

const toneClasses = {
  blue: {
    shell: 'from-sky-50 via-white to-white border-sky-100/80',
    iconWrap: 'bg-sky-100 text-sky-700 shadow-[0_16px_34px_-20px_rgba(14,116,244,0.45)]',
    glow: 'bg-sky-400/12',
    accent: 'text-sky-700',
  },
  emerald: {
    shell: 'from-emerald-50 via-white to-white border-emerald-100/80',
    iconWrap: 'bg-emerald-100 text-emerald-700 shadow-[0_16px_34px_-20px_rgba(5,150,105,0.4)]',
    glow: 'bg-emerald-400/12',
    accent: 'text-emerald-700',
  },
  amber: {
    shell: 'from-amber-50 via-white to-white border-amber-100/80',
    iconWrap: 'bg-amber-100 text-amber-700 shadow-[0_16px_34px_-20px_rgba(217,119,6,0.4)]',
    glow: 'bg-amber-400/12',
    accent: 'text-amber-700',
  },
  violet: {
    shell: 'from-violet-50 via-white to-white border-violet-100/80',
    iconWrap: 'bg-violet-100 text-violet-700 shadow-[0_16px_34px_-20px_rgba(109,40,217,0.4)]',
    glow: 'bg-violet-400/12',
    accent: 'text-violet-700',
  },
  slate: {
    shell: 'from-slate-50 via-white to-white border-slate-200/80',
    iconWrap: 'bg-slate-100 text-slate-700 shadow-[0_16px_34px_-20px_rgba(15,23,42,0.2)]',
    glow: 'bg-slate-400/10',
    accent: 'text-slate-700',
  },
};

function StatCard({
  label,
  value,
  icon: Icon = null,
  change = null,
  changeLabel = 'vs periodo anterior',
  caption = null,
  tone = 'blue',
}) {
  const palette = toneClasses[tone] || toneClasses.blue;
  const isPositive = change > 0;
  const isNegative = change < 0;

  const TrendIcon = isPositive ? ArrowUpRight : isNegative ? ArrowDownRight : Minus;
  const trendClass = isPositive
    ? 'text-emerald-600 bg-emerald-50 border-emerald-100'
    : isNegative
      ? 'text-red-600 bg-red-50 border-red-100'
      : 'text-slate-500 bg-slate-50 border-slate-200';

  return (
    <article className={`motion-card group relative overflow-hidden rounded-[1.45rem] sm:rounded-[1.6rem] border bg-gradient-to-br ${palette.shell} p-4 sm:p-5 shadow-[0_24px_50px_-38px_rgba(15,23,42,0.35)]`}>
      <div className={`absolute -right-10 top-0 h-28 w-28 rounded-full blur-3xl ${palette.glow}`} />

      <div className="relative flex items-start justify-between gap-3 sm:gap-4">
        <div className={`flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl ${palette.iconWrap}`}>
          {Icon ? <Icon size={20} strokeWidth={2.2} /> : <span className="text-sm font-bold">--</span>}
        </div>

        {change !== null && (
          <div className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold ${trendClass}`}>
            <TrendIcon size={13} strokeWidth={2.2} />
            {Math.abs(change)}%
          </div>
        )}
      </div>

      <div className="relative mt-4 sm:mt-5 space-y-2">
        <p className="text-[0.68rem] sm:text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-surface-500">
          {label}
        </p>
        <p className="font-display text-[clamp(1.6rem,4vw,2.6rem)] font-semibold tracking-[-0.04em] text-surface-950 break-words">
          {value}
        </p>
        {caption && <p className="text-sm leading-relaxed text-surface-500">{caption}</p>}
      </div>

      {change !== null && (
        <div className="relative mt-4 sm:mt-5 flex items-center justify-between border-t border-surface-100/80 pt-4 text-xs gap-3">
          <span className={`font-semibold ${palette.accent}`}>Pulso operativo</span>
          <span className="text-right text-surface-500">{changeLabel}</span>
        </div>
      )}
    </article>
  );
}

export default StatCard;
