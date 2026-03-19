function Button({ children, variant = 'primary', size = 'md', type = 'button', onClick, disabled = false, className = '' }) {
  const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500',
    secondary: 'bg-surface-100 text-surface-700 hover:bg-surface-200 focus:ring-surface-400',
    danger: 'bg-danger text-white hover:bg-red-600 focus:ring-danger',
    ghost: 'text-surface-600 hover:bg-surface-100 focus:ring-surface-400',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

export default Button;
