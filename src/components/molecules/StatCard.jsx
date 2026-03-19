function StatCard({ label, value, trend, trendDirection }) {
  return (
    <div className="stat-card">
      <span className="stat-card__label">{label}</span>
      <span className="stat-card__value">{value}</span>
      {trend && (
        <span className={`stat-card__trend stat-card__trend--${trendDirection || 'up'}`}>
          {trend}
        </span>
      )}
    </div>
  );
}

export default StatCard;
