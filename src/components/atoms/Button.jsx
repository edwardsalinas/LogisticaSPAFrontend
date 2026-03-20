function Button({ children, variant = 'primary', size = 'md', type = 'button', onClick, disabled = false, className = '' }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-xl font-semibold tracking-[0.01em] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none';

  const variants = {
    primary: 'bg-[linear-gradient(135deg,#0b4ea2_0%,#137fec_100%)] text-white shadow-[0_18px_40px_-24px_rgba(19,127,236,0.75)] hover:-translate-y-0.5 hover:shadow-[0_22px_48px_-24px_rgba(19,127,236,0.85)] focus:ring-primary-500',
    secondary: 'border border-surface-200 bg-white text-surface-700 hover:bg-surface-100 focus:ring-surface-400',
    danger: 'bg-danger text-white hover:bg-red-600 focus:ring-danger',
    ghost: 'text-surface-600 hover:bg-surface-100 focus:ring-surface-400',
  };

  const sizes = {
    sm: 'px-3.5 py-2 text-sm',
    md: 'px-4.5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
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
