/**
 * StatCard - Tarjeta de estadística mejorada con icono y cambio porcentual
 * @param {string} label - Etiqueta descriptiva
 * @param {string|number} value - Valor principal
 * @param {React.ReactNode} icon - Icono o emoji del stat
 * @param {number} change - Porcentaje de cambio (positivo o negativo)
 * @param {string} changeLabel - Etiqueta del cambio (ej: "vs mes anterior")
 */
function StatCard({ label, value, icon = null, change = null, changeLabel = 'vs período anterior' }) {
  const isPositive = change >= 0;

  return (
    <div className="stat-card stat-card--interactive">
      {icon && (
        <div className="stat-card__icon">
          {icon}
        </div>
      )}
      <div className="stat-card__body">
        <span className="stat-card__label">{label}</span>
        <span className="stat-card__value">{value}</span>
        {change !== null && (
          <div className="stat-card__footer">
            <span className={`stat-card__trend stat-card__trend--${isPositive ? 'up' : 'down'}`}>
              {isPositive ? '↗' : '↘'} {Math.abs(change)}%
            </span>
            <span className="stat-card__trend-label">{changeLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default StatCard;
