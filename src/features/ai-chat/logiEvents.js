import apiService from '../../services/apiService';

/**
 * Anota un evento de uso de Logi (aviso mostrado o aceptado, acción hecha o detenida…) para las métricas del panel de uso.
 * Solo viaja el nombre del evento y su tipo, nunca contenido. Es «dispara y olvida»: si falla, no pasa nada.
 */
export const trackLogi = (event, type) => {
  try {
    Promise.resolve(apiService.trackLogiEvent?.(type ? { event, type } : { event })).catch(() => {});
  } catch {
    /* las métricas nunca deben romper la pantalla */
  }
};
