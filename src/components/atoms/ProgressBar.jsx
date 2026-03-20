/**
 * ProgressBar - Componente atómico para mostrar progreso porcentual
 * @param {number} value - Valor actual (0-100)
 * @param {string} size - Tamaño: 'sm', 'md', 'lg'
 * @param {string} variant - Variante: 'primary', 'success', 'warning', 'danger'
 * @param {boolean} showLabel - Mostrar etiqueta de porcentaje
 */
function ProgressBar({ value = 0, size = 'md', variant = 'primary', showLabel = false }) {
  // Normalizar valor entre 0 y 100
  const normalizedValue = Math.min(100, Math.max(0, value));

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  const variantClasses = {
    primary: 'bg-primary-500',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
  };

  return (
    <div className="w-full">
      <div className={`progress-bar ${sizeClasses[size]}`}>
        <div
          className={`progress-bar__fill ${variantClasses[variant]}`}
          style={{ width: `${normalizedValue}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-surface-500 mt-1 block text-right">
          {normalizedValue.toFixed(0)}%
        </span>
      )}
    </div>
  );
}

export default ProgressBar;
