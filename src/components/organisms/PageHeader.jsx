import NumberFlow from '@number-flow/react';

const TONES = {
  default: 'text-surface-950',
  success: 'text-emerald-700',
  warning: 'text-amber-700',
  danger: 'text-red-700',
};

function StatList({ stats, full }) {
  return (
    <dl className={`grid grid-cols-2 gap-x-6 gap-y-3 sm:flex sm:divide-x sm:divide-surface-200 ${full ? 'w-full sm:[&>div]:flex-1' : 'sm:flex-nowrap'}`}>
      {stats.map((s) => (
        <div key={s.label} className="min-w-0 sm:pl-6 sm:first:pl-0">
          <dt className="whitespace-nowrap text-xs font-medium text-surface-600">{s.label}</dt>
          <dd className={`font-display text-2xl font-semibold tabular-nums tracking-[-0.03em] ${TONES[s.tone] || TONES.default}`}>
            {typeof s.value === 'number' ? <NumberFlow value={s.value} suffix={s.suffix} locales="es" /> : s.value}
          </dd>
          {s.hint ? <p className="text-xs text-surface-500">{s.hint}</p> : null}
        </div>
      ))}
    </dl>
  );
}

/**
 * Cabecera compacta de las pantallas operativas: el título, una línea de contexto y los indicadores clave.
 * Sustituye a los banners con foto: lo importante de la pantalla (tabla, calendario, mapa) queda a la vista sin desplazarse.
 *
 * stats: [{ label, value, suffix?, hint?, tone? }] con tone en default | success | warning | danger.
 * Si value es un número se anima al cambiar (number-flow); si es texto ("—", "4,8k") se muestra tal cual.
 * Con pocos indicadores y sin botón van a la derecha del título; con muchos (más de 4) o con botón, en una fila propia debajo.
 * titleAdornment: algo junto al título (p. ej. el estado del paquete). titleClassName: ajustes del título (p. ej. break-all para códigos largos).
 * El título es un h2: el h1 de la pantalla es el de la barra superior.
 */
function PageHeader({ title, titleClassName = '', titleAdornment, description, stats = [], actions, className = '' }) {
  const hasStats = stats.length > 0;
  const inline = hasStats && stats.length <= 4 && !actions;

  return (
    <section className={`rounded-2xl border border-surface-200 bg-white p-5 shadow-sm sm:p-6 ${className}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className={`font-display text-2xl font-semibold tracking-[-0.03em] text-surface-950 sm:text-3xl ${titleClassName}`}>{title}</h2>
            {titleAdornment}
          </div>
          {description ? <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-surface-600">{description}</p> : null}
        </div>
        {inline ? <StatList stats={stats} /> : null}
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>

      {hasStats && !inline ? (
        <div className="mt-4 border-t border-surface-200 pt-4">
          <StatList stats={stats} full />
        </div>
      ) : null}
    </section>
  );
}

export default PageHeader;
