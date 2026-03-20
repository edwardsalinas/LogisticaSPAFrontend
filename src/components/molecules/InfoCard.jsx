/**
 * InfoCard - Tarjeta de información con título e icono
 * @param {string} title - Título de la card
 * @param {React.ReactNode} icon - Icono o emoji
 * @param {React.ReactNode} children - Contenido de la card
 * @param {string} className - Clases adicionales
 */
function InfoCard({ title, icon, children, className = '' }) {
  return (
    <div className={`info-card bg-white rounded-lg shadow-sm p-5 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="info-card__icon w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center text-xl">
          {icon}
        </div>
        <h3 className="info-card__title text-sm font-bold text-surface-900 uppercase tracking-wide">
          {title}
        </h3>
      </div>
      <div className="info-card__content">
        {children}
      </div>
    </div>
  );
}

export default InfoCard;
