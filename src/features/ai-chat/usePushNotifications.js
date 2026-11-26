import { useCallback, useEffect, useRef, useState } from 'react';
import { disablePush, enablePush, pushStatus } from '../../services/pushService';

/** El estado de los avisos con la pestaña cerrada en este navegador y cómo cambiarlo. `status` es null mientras se consulta. */
export default function usePushNotifications(enabled = true) {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    if (!enabled) return undefined;
    pushStatus().then((s) => { if (alive.current) setStatus(s); }).catch(() => { if (alive.current) setStatus('unavailable'); });
    return () => { alive.current = false; };
  }, [enabled]);

  const toggle = useCallback(async () => {
    setBusy(true);
    try {
      const next = status === 'on' ? await disablePush() : await enablePush();
      if (alive.current) setStatus(next);
    } finally {
      if (alive.current) setBusy(false);
    }
  }, [status]);

  return { status, busy, toggle };
}
