import { plainText } from '../voice';

const MAX_CHARS = 140;

/**
 * Qué se anuncia a un lector de pantalla cuando el asistente responde. Una frase corta, no la respuesta entera con
 * todas sus tarjetas (anunciar todo en cada mensaje satura): el resto se lee navegando por la conversación.
 */
export const announcementFor = (messages = [], loading = false) => {
  if (loading) return 'Consultando…';
  const last = messages[messages.length - 1];
  if (!last || last.role !== 'assistant') return '';
  if (last.isError) return 'El asistente no pudo responder.';

  const attachments = last.attachments ?? [];
  const proposal = attachments.find((a) => a.kind === 'action_proposal');
  const firstSentence = plainText(last.content).split(/(?<=[.!?])\s/)[0] ?? '';
  const spoken = firstSentence.length > MAX_CHARS ? `${firstSentence.slice(0, MAX_CHARS).trimEnd()}…` : firstSentence;

  let extra = '';
  if (proposal) extra = ` Hay una acción esperando tu confirmación: ${proposal.action.title}. Usa Confirmar o Cancelar en la tarjeta.`;
  else if (attachments.length > 0) extra = ' Los detalles están en las tarjetas.';
  return `Respuesta del asistente: ${spoken}${extra}`.trim();
};

/** Región viva, invisible, que anuncia el estado del chat (consultando / respondió / hay una acción pendiente). */
export default function Announcer({ messages, loading }) {
  return (
    <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {announcementFor(messages, loading)}
    </p>
  );
}
