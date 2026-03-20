/**
 * Avatar - Componente atómico para mostrar iniciales de usuario
 * @param {string} name - Nombre completo del usuario
 * @param {string} src - URL de imagen (opcional)
 * @param {string} size - Tamaño: 'sm', 'md', 'lg'
 * @param {string} className - Clases adicionales
 */
function Avatar({ name = '', src = null, size = 'md', className = '' }) {
  // Generar iniciales del nombre
  const getInitials = (fullName) => {
    if (!fullName) return '?';
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  // Generar color basado en el nombre (hash simple)
  const getColor = (fullName) => {
    const colors = [
      'bg-primary-500',
      'bg-success',
      'bg-info',
      'bg-warning',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
    ];
    
    if (!fullName) return 'bg-surface-400';
    
    const hash = fullName
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    return colors[hash % colors.length];
  };

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  // Si hay imagen, usarla
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`avatar rounded-full object-cover ${sizeClasses[size]} ${className}`}
      />
    );
  }

  // Si no, usar iniciales con color
  return (
    <div
      className={`avatar ${sizeClasses[size]} ${getColor(name)} text-white font-semibold rounded-full inline-flex items-center justify-center ${className}`}
    >
      {getInitials(name)}
    </div>
  );
}

export default Avatar;
