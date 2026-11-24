import { toast } from 'sonner';

/**
 * Qué pasó cuando Logi hizo una acción a la vista de todos (resultado de GuidedRunProvider.start). Lo comparten la tarjeta
 * de confirmación («Que Logi lo haga») y el chat de voz («sí, hazlo»), para que ambas terminen igual:
 *  - detenido → no se hizo nada: la acción sigue pendiente (devuelve null);
 *  - error → el estado de error de la tarjeta;
 *  - hecho → igual que si se hubiera pulsado «Confirmar» (y se recuerda en el chat para dibujar la tarjeta resuelta).
 */
/** El resultado de una acción hecha, con lo que el registro de actividad necesita (qué fue, cuándo y qué dejó). */
export const makeOutcome = (action, res) => ({
  status: 'done',
  type: action.type,
  title: action.title,
  at: Date.now(),
  message: res?.result?.message,
  results: res?.result?.data?.results,
  records: res?.result?.data?.records,
});

export function applyGuidedOutcome({ out, action, chat }) {
  if (out.result?.demo) {
    toast('Demostración terminada', { description: 'No se guardó nada: la acción sigue pendiente por si quieres hacerla.' });
    return null;
  }
  if (out.stopped) {
    toast('Logi se detuvo', { description: 'No se hizo ningún cambio. Puedes confirmar o pedirle que lo intente otra vez.' });
    return null;
  }
  if (out.error) {
    toast.error('No se pudo completar la acción', { description: out.error.message });
    return { status: 'error', message: out.error.message || 'No se pudo completar la acción.' };
  }
  const outcome = makeOutcome(action, out.result);
  chat?.settleAction?.(action.id, outcome);
  toast.success('Acción ejecutada', { description: action.title });
  return outcome;
}
