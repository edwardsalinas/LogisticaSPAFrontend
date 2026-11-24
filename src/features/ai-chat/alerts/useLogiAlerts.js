import { useCallback, useEffect, useState } from 'react';
import apiService from '../../../services/apiService';
import { trackLogi } from '../logiEvents';
import { isRelevantPath, markShown, markSnoozed, muteType, pickAlert, setEnabled, SHOW_DELAY_MS } from './alertPolicy';
import { savePrefs, useAlertPrefs } from './alertPrefs';

const POLL_MS = 5 * 60 * 1000; // se revisan las excepciones cada 5 minutos
const VISIBLE_MS = 45 * 1000; // un aviso sin atender se recoge solo a los 45 segundos (no se queda estorbando)

/**
 * Los avisos proactivos de Logi: pide al servidor las excepciones de la operación y decide cuándo mostrar una (ver
 * alertPolicy: pocas, atadas a la pantalla, sin repetirse y descartables). `busy` = Logi o el chat ya están ocupados.
 */
export default function useLogiAlerts({ allowed, pathname, busy }) {
  const prefs = useAlertPrefs();
  const [alerts, setAlerts] = useState([]);
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    if (!allowed) return undefined;
    let alive = true;
    const load = async () => {
      try {
        const res = await apiService.getLogiAlerts?.();
        // una lista NUEVA en cada revisión: así el aviso se vuelve a evaluar al pasar la hora aunque el servidor devuelva lo mismo
        if (alive) setAlerts(Array.isArray(res?.data) ? [...res.data] : []);
      } catch { /* sin avisos: no pasa nada */ }
    };
    load();
    const timer = setInterval(load, POLL_MS);
    return () => { alive = false; clearInterval(timer); };
  }, [allowed]);

  // elige uno que corresponda y lo muestra tras unos segundos (la persona primero se asienta en la pantalla)
  useEffect(() => {
    if (!allowed || busy || current) return undefined;
    const next = pickAlert({ alerts, prefs, pathname });
    if (!next) return undefined;
    const timer = setTimeout(() => {
      savePrefs(markShown(prefs, next));
      setCurrent(next);
      trackLogi('alert_shown', next.type);
    }, SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [allowed, busy, current, alerts, prefs, pathname]);

  // se retira si Logi se ocupa, si se cambia a una pantalla donde ya no corresponde o si pasa el tiempo
  useEffect(() => {
    if (current && (busy || !isRelevantPath(current.type, pathname))) setCurrent(null);
  }, [busy, pathname, current]);
  useEffect(() => {
    if (!current) return undefined;
    const timer = setTimeout(() => setCurrent(null), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [current]);

  const dismiss = useCallback(() => setCurrent(null), []);
  const snooze = useCallback((alert) => { savePrefs(markSnoozed(prefs, alert)); trackLogi('alert_snoozed', alert.type); setCurrent(null); }, [prefs]);
  const mute = useCallback((alert) => { savePrefs(muteType(prefs, alert.type)); trackLogi('alert_muted', alert.type); setCurrent(null); }, [prefs]);
  const toggleEnabled = useCallback((on) => { savePrefs(setEnabled(prefs, on)); if (!on) setCurrent(null); }, [prefs]);

  return { alert: current, enabled: prefs.enabled, dismiss, snooze, mute, setEnabled: toggleEnabled };
}
