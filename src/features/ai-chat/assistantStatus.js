import { useEffect, useRef, useState } from 'react';

/**
 * Qué está haciendo el asistente, para el botón flotante cuando el panel está cerrado:
 *  confirm  – propuso una acción y espera que la persona la confirme (lo más urgente)
 *  thinking – está procesando la consulta
 *  unread   – respondió mientras el panel estaba cerrado
 *  idle     – nada pendiente
 */
export const STATUS_TEXT = {
  confirm: 'Espera tu confirmación',
  thinking: 'Pensando…',
  unread: 'Nueva respuesta',
  idle: '',
};

/** ¿Hay una acción propuesta en el último mensaje del asistente que sigue sin confirmarse ni cancelarse y no venció? */
export const hasPendingProposal = (messages, settled = new Set(), now = Date.now()) => {
  const last = messages[messages.length - 1];
  if (!last || last.role !== 'assistant') return false;
  return (last.attachments ?? []).some((a) => {
    if (a?.kind !== 'action_proposal' || !a.action) return false;
    if (settled.has(a.action.id)) return false;
    const expires = a.action.expires_at ? Date.parse(a.action.expires_at) : null;
    return expires === null || Number.isNaN(expires) || expires > now;
  });
};

export const deriveAssistantStatus = ({ messages, loading, settled, unread }) => {
  if (hasPendingProposal(messages, settled)) return 'confirm';
  if (loading) return 'thinking';
  if (unread) return 'unread';
  return 'idle';
};

/** Estado para el botón. `panelOpen` apaga el aviso de "nueva respuesta" (ya la está viendo). */
export function useAssistantStatus(chat, panelOpen) {
  const [unread, setUnread] = useState(false);
  const seen = useRef(chat.messages.filter((m) => m.role === 'assistant').length);

  useEffect(() => {
    const count = chat.messages.filter((m) => m.role === 'assistant').length;
    if (panelOpen) {
      seen.current = count;
      setUnread(false);
    } else if (count > seen.current && !chat.loading) {
      seen.current = count;
      setUnread(true);
    } else if (count < seen.current) {
      seen.current = count; // conversación nueva o reabierta
    }
  }, [chat.messages, chat.loading, panelOpen]);

  const status = deriveAssistantStatus({ messages: chat.messages, loading: chat.loading, settled: chat.settledActions, unread });
  return { status, text: STATUS_TEXT[status] };
}
