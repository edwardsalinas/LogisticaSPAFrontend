import { useEffect, useImperativeHandle, useRef } from 'react';

/**
 * CAPTCHA (Cloudflare Turnstile).
 * Si VITE_TURNSTILE_SITE_KEY no está definida, no se muestra nada (entornos de desarrollo)
 * y el backend tampoco lo exige cuando TURNSTILE_SECRET_KEY está vacía.
 *
 * Los tokens son de un solo uso: llamar a `ref.current.reset()` después de cada envío.
 */
export const CAPTCHA_ENABLED = Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY);

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let scriptPromise = null;

const loadScript = () => {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_SRC;
      script.async = true;
      script.onload = () => resolve(window.turnstile);
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error('No se pudo cargar el captcha'));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
};

function Captcha({ onToken, ref, theme = 'auto' }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useImperativeHandle(ref, () => ({
    reset() {
      onTokenRef.current?.(null);
      if (window.turnstile && widgetIdRef.current !== null) window.turnstile.reset(widgetIdRef.current);
    },
  }));

  useEffect(() => {
    if (!CAPTCHA_ENABLED) return undefined;
    let cancelled = false;

    loadScript()
      .then((turnstile) => {
        if (cancelled || !containerRef.current) return;
        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY,
          theme,
          callback: (token) => onTokenRef.current?.(token),
          'expired-callback': () => onTokenRef.current?.(null),
          'error-callback': () => onTokenRef.current?.(null),
        });
      })
      .catch(() => onTokenRef.current?.(null));

    return () => {
      cancelled = true;
      if (window.turnstile && widgetIdRef.current !== null) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [theme]);

  if (!CAPTCHA_ENABLED) return null;
  return <div ref={containerRef} className="flex justify-center" data-testid="captcha" />;
}

export default Captcha;
