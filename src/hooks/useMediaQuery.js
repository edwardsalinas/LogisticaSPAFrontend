import { useEffect, useState } from 'react';

/** true mientras la consulta de medios coincide (p. ej. '(max-width: 767px)'). Sin matchMedia (pruebas) devuelve false. */
export default function useMediaQuery(query) {
  const supported = typeof window !== 'undefined' && typeof window.matchMedia === 'function';
  const [matches, setMatches] = useState(() => (supported ? window.matchMedia(query).matches : false));

  useEffect(() => {
    if (!supported) return undefined;
    const mql = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query, supported]);

  return matches;
}
