import { useCallback, useRef, useState } from 'react';
import apiService from '../../services/apiService';

const HISTORY_LIMIT = 10; // el backend acepta como máximo 10 mensajes previos
export const MAX_MESSAGE_LENGTH = 1000;

/**
 * Conversación con el asistente, compartida por el panel flotante y la vista del Modo IA.
 * Cada mensaje: { role, content, attachments?, isError?, local? }.
 * Los mensajes locales (saludo) y los errores no se envían como contexto.
 */
export default function useAssistantChat(initialMessages = []) {
  const [messages, setMessages] = useState(initialMessages);
  const [loading, setLoading] = useState(false);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const loadingRef = useRef(false);

  const send = useCallback(async (rawText) => {
    const text = String(rawText ?? '').trim();
    if (!text || loadingRef.current) return false;

    const history = messagesRef.current
      .filter((m) => !m.local && !m.isError)
      .slice(-HISTORY_LIMIT)
      .map(({ role, content }) => ({ role, content }));

    loadingRef.current = true;
    setLoading(true);
    setMessages((prev) => [...prev, { role: 'user', content: text }]);

    try {
      const res = await apiService.post('/ai-agent/chat', { message: text, history });
      setMessages((prev) => [...prev, { role: 'assistant', content: res.response, attachments: res.attachments ?? [] }]);
    } catch (err) {
      const content =
        err.status === 429 || err.status === 503
          ? 'El asistente está recibiendo muchas consultas. Espera un minuto e inténtalo de nuevo.'
          : 'No pude procesar tu consulta en este momento. Inténtalo nuevamente.';
      setMessages((prev) => [...prev, { role: 'assistant', content, isError: true }]);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
    return true;
  }, []);

  const reset = useCallback((nextMessages = []) => setMessages(nextMessages), []);

  return { messages, loading, send, reset };
}
