/**
 * Logi, el robot del asistente. Es decorativo (aria-hidden): quien lo usa ya expone el estado con texto.
 *
 * mood:
 *  idle     – parpadea y flota suavemente
 *  thinking – mira a los lados y la antena late
 *  talking  – mueve la boca mientras escribe la respuesta
 *  confirm  – antena ámbar y ojos atentos (espera tu confirmación)
 *  unread   – saluda moviendo la antena (hay una respuesta nueva)
 *
 * Las animaciones viven en index.css (.logi-*) y se apagan con prefers-reduced-motion.
 */
const ANTENNA = { idle: '#38bdf8', thinking: '#38bdf8', talking: '#38bdf8', confirm: '#f59e0b', unread: '#38bdf8' };

function AssistantAvatar({ mood = 'idle', size = 40, className = '' }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      data-mood={mood}
      className={`logi logi--${mood} shrink-0 ${className}`}
    >
      <defs>
        <linearGradient id="logi-head" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <g className="logi__body">
        {/* antena */}
        <g className="logi__antenna">
          <line x1="32" y1="14" x2="32" y2="7" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
          <circle className="logi__bulb" cx="32" cy="6" r="3.6" fill={ANTENNA[mood] ?? ANTENNA.idle} />
        </g>
        {/* orejas */}
        <rect x="5" y="30" width="6" height="13" rx="3" fill="#1e40af" />
        <rect x="53" y="30" width="6" height="13" rx="3" fill="#1e40af" />
        {/* cabeza */}
        <rect x="9" y="14" width="46" height="40" rx="15" fill="url(#logi-head)" />
        {/* pantalla de la cara */}
        <rect x="14" y="22" width="36" height="25" rx="11" fill="#0b1b3a" />
        {/* ojos */}
        <g className="logi__eyes">
          <ellipse className="logi__eye" cx="24.5" cy="33" rx="3.6" ry="4.4" fill="#7dd3fc" />
          <ellipse className="logi__eye" cx="39.5" cy="33" rx="3.6" ry="4.4" fill="#7dd3fc" />
        </g>
        {/* mejillas */}
        <circle cx="19.5" cy="40.5" r="2.4" fill="#f472b6" opacity="0.45" />
        <circle cx="44.5" cy="40.5" r="2.4" fill="#f472b6" opacity="0.45" />
        {/* boca */}
        <path className="logi__mouth" d="M27 40.5 Q32 45 37 40.5" fill="none" stroke="#7dd3fc" strokeWidth="2.4" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export default AssistantAvatar;
