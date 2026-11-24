import { toast } from 'sonner';

/**
 * Qué pasó cuando Logi hizo una acción a la vista de todos (resultado de GuidedRunProvider.start). Lo comparten la tarjeta
 * de confirmación («Que Logi lo haga») y el chat de voz («sí, hazlo»), para que ambas terminen igual:
 *  - detenido → no se hizo nada: la acción sigue pendiente (devuelve null);
 *  - error → el estado de error de la tarjeta;
 *  - hecho → igual que si se hubiera pulsado «Confirmar» (y se recuerda en el chat para dibujar la tarjeta resuelta).
 */
export function applyGuidedOutcome({ out, action, chat }) {
  if (out.stopped) {
    toast('Logi se detuvo', { description: 'No se hizo ningún cambio. Puedes confirmar o pedirle que lo intente otra vez.' });
    return null;
  }
  if (out.error) {
    toast.error('No se pudo completar la acción', { description: out.error.message });
    return { status: 'error', message: out.error.message || 'No se pudo completar la acción.' };
  }
  const res = out.result;
  const outcome = { status: 'done', message: res?.result?.message, results: res?.result?.data?.results, records: res?.result?.data?.records };
  chat?.settleAction?.(action.id, outcome);
  toast.success('Acción ejecutada', { description: action.title });
  return outcome;
}
