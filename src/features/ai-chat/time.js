const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

/** "hace 5 min", "ayer", "hace 3 días": cuánto pasó desde una fecha (o '' si no es válida). */
export const relativeTime = (iso, now = Date.now()) => {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const seconds = Math.round((t - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return 'justo ahora';
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), 'hour');
  if (abs < 86400 * 30) return rtf.format(Math.round(seconds / 86400), 'day');
  return new Date(t).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' });
};
