import { createContext, useCallback, useContext, useRef, useState } from 'react';
import apiService from '../../services/apiService';

const HISTORY_LIMIT = 16; // el backend acepta como máximo 16 mensajes previos
export const MAX_MESSAGE_LENGTH = 1000;

/** Conversación compartida: el panel flotante, la vista del Modo IA y el modo voz hablan en la misma. */
export const ChatContext = createContext(null);

/**
 * Estado de una conversación con el asistente.
 * Cada mensaje: { role, content, attachments?, isError?, local? }.
 * Los mensajes locales y los errores no se envían como contexto.
 */
export function useChatState(initialMessages = []) {
  const [messages, setMessages] = useState(initialMessages);
  const [loading, setLoading] = useState(false);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const loadingRef = useRef(false);
  const idRef = useRef(0);
  const nextId = () => { idRef.current += 1; return idRef.current; }; // clave estable de lista (no el índice)

  /**
   * Envía un mensaje. `voice: true` pide una respuesta corta y hablada (se leerá en voz alta).
   * Devuelve { ok, text, attachments, isError } o null si no se envió.
   */
  const send = useCallback(async (rawText, { voice = false } = {}) => {
    const text = String(rawText ?? '').trim();
    if (!text || loadingRef.current) return null;

    const history = messagesRef.current
      .filter((m) => !m.local && !m.isError)
      .slice(-HISTORY_LIMIT)
      .map(({ role, content }) => ({ role, content }));

    loadingRef.current = true;
    setLoading(true);
    setMessages((prev) => [...prev, { id: nextId(), role: 'user', content: text }]);

    try {
      const res = await apiService.post('/ai-agent/chat', { message: text, history, ...(voice ? { voice: true } : {}) });
      const attachments = res.attachments ?? [];
      setMessages((prev) => [...prev, { id: nextId(), role: 'assistant', content: res.response, attachments }]);
      return { ok: true, text: res.response, attachments, isError: false };
    } catch (err) {
      const content =
        err.status === 429 || err.status === 503
          ? 'El asistente está recibiendo muchas consultas. Espera un minuto e inténtalo de nuevo.'
          : 'No pude procesar tu consulta en este momento. Inténtalo nuevamente.';
      setMessages((prev) => [...prev, { id: nextId(), role: 'assistant', content, isError: true }]);
      return { ok: false, text: content, attachments: [], isError: true };
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  const reset = useCallback((nextMessages = []) => setMessages(nextMessages), []);

  return { messages, loading, send, reset };
}

/**
 * Conversación del asistente. Dentro de <AssistantChatProvider> es la compartida (no se pierde al cambiar de
 * pantalla); fuera, cada componente tiene la suya (útil para pruebas aisladas).
 */
export default function useAssistantChat(initialMessages = []) {
  const shared = useContext(ChatContext);
  const local = useChatState(initialMessages); // siempre se llama (reglas de los hooks); sin uso si hay conversación compartida
  return shared ?? local;
}
