import { createContext, useCallback, useContext, useRef, useState } from 'react';
import apiService from '../../services/apiService';
import { fileToJpegBase64 } from '../../utils/imageForUpload';

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
  const [conversationId, setConversationId] = useState(null); // conversación guardada a la que pertenece este chat
  const conversationRef = useRef(null);
  const [settledActions, setSettledActions] = useState(() => new Set()); // acciones propuestas ya confirmadas o canceladas
  const [actionOutcomes, setActionOutcomes] = useState(() => new Map()); // y cómo terminaron (para volver a dibujar la tarjeta)
  const [status, setStatus] = useState(''); // qué está consultando el asistente ("Buscando tu paquete…")
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const loadingRef = useRef(false);
  const idRef = useRef(0);
  const nextId = () => { idRef.current += 1; return idRef.current; }; // clave estable de lista (no el índice)

  const TOOL_LABELS = {
    get_package_tracking: 'Buscando tu paquete…',
    find_packages_by_person: 'Buscando por nombre…',
    list_my_packages: 'Revisando tus paquetes…',
    get_operations_summary: 'Revisando la operación…',
    list_packages_needing_attention: 'Buscando lo que requiere atención…',
    get_daily_briefing: 'Preparando el resumen del día…',
    get_fleet_status: 'Consultando la flota…',
    check_fleet_availability: 'Revisando disponibilidad…',
    find_available_trips: 'Buscando viajes…',
    list_routes: 'Consultando las rutas…',
    get_route_info: 'Consultando la ruta…',
    get_my_deliveries: 'Revisando tu agenda…',
    get_analytics_summary: 'Calculando las cifras…',
  };

  const failureMessage = (err) =>
    err?.status === 429 || err?.status === 503
      ? 'El asistente está recibiendo muchas consultas. Espera un minuto e inténtalo de nuevo.'
      : 'No pude procesar tu consulta en este momento. Inténtalo nuevamente.';

  /**
   * Envía un mensaje. `voice: true` pide una respuesta corta y hablada (se leerá en voz alta).
   * La respuesta llega en vivo (el texto aparece a medida que se escribe); si el navegador o la red no lo permiten,
   * se usa la petición normal. Devuelve { ok, text, attachments, isError } o null si no se envió.
   */
  const send = useCallback(async (rawText, { voice = false } = {}) => {
    const text = String(rawText ?? '').trim();
    if (!text || loadingRef.current) return null;

    const history = messagesRef.current
      .filter((m) => !m.local && !m.isError && !m.streaming)
      .slice(-HISTORY_LIMIT)
      .map(({ role, content }) => ({ role, content }));
    const body = { message: text, history, ...(voice ? { voice: true } : {}), ...(conversationRef.current ? { conversation_id: conversationRef.current } : {}) };

    loadingRef.current = true;
    setLoading(true);
    setStatus('');
    setMessages((prev) => [...prev, { id: nextId(), role: 'user', content: text }]);

    // --- respuesta en vivo
    let streamId = null;
    let buffer = '';
    let timer = null;
    const flush = () => {
      timer = null;
      if (streamId === null) return;
      const snapshot = buffer;
      const id = streamId; // se captura: el updater de React corre después y streamId puede haber cambiado
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content: snapshot } : m)));
    };
    const dropStream = () => {
      if (timer) { clearTimeout(timer); timer = null; }
      if (streamId !== null) { const id = streamId; setMessages((prev) => prev.filter((m) => m.id !== id)); streamId = null; }
      buffer = '';
    };

    const finalize = (res) => {
      if (timer) { clearTimeout(timer); timer = null; }
      if (res.conversation_id) { conversationRef.current = res.conversation_id; setConversationId(res.conversation_id); }
      const attachments = res.attachments ?? [];
      const reply = { role: 'assistant', content: res.response, attachments, streaming: false };
      if (streamId !== null) {
        const id = streamId;
        setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...reply } : m)));
      } else {
        setMessages((prev) => [...prev, { id: nextId(), ...reply }]);
      }
      return { ok: true, text: res.response, attachments, isError: false };
    };

    try {
      if (typeof apiService.chatStream === 'function') {
        try {
          const res = await apiService.chatStream(body, {
            onStatus: (tool) => setStatus(TOOL_LABELS[tool] ?? 'Consultando…'),
            onToken: (piece) => {
              buffer += piece;
              if (streamId === null) {
                const id = nextId();
                streamId = id;
                const first = buffer;
                setMessages((prev) => [...prev, { id, role: 'assistant', content: first, streaming: true }]);
              } else if (!timer) {
                timer = setTimeout(flush, 40); // agrupa los trozos: no se redibuja el mensaje en cada token
              }
            },
            onReset: dropStream,
          });
          return finalize(res);
        } catch (err) {
          // Sin respuesta en vivo (red, proxy o navegador sin soporte) y sin haber mostrado nada: petición normal
          const canFallback = streamId === null && (err?.code === 'NO_STREAM' || err?.code === 'STREAM_CUT' || err?.status === undefined);
          if (!canFallback) throw err;
        }
      }
      const res = await apiService.post('/ai-agent/chat', body);
      return finalize(res);
    } catch (err) {
      dropStream();
      const content = failureMessage(err);
      setMessages((prev) => [...prev, { id: nextId(), role: 'assistant', content, isError: true }]);
      return { ok: false, text: content, attachments: [], isError: true };
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setStatus('');
    }
  }, []);

  /**
   * Lee la foto de una guía de remisión: muestra los datos para que la persona los revise (tarjeta editable). Los mensajes
   * son locales: no se guardan en el historial ni se envían como contexto. Devuelve true si se pudo leer.
   */
  const readDocument = useCallback(async (file) => {
    if (loadingRef.current || !file) return false;
    loadingRef.current = true;
    setLoading(true);
    setStatus('Leyendo la guía…');
    const push = (m) => setMessages((prev) => [...prev, { id: nextId(), local: true, ...m }]);
    push({ role: 'user', content: `Foto de la guía de remisión: ${file.name || 'imagen'}` });
    try {
      const image = await fileToJpegBase64(file);
      const res = await apiService.extractDocument({ image: image.base64, mime: image.mime });
      const data = res?.data ?? {};
      push({
        role: 'assistant',
        content: data.missing?.length ? 'Leí la guía, pero faltan algunos datos. Revísalos y complétalos antes de continuar.' : 'Leí la guía. Revisa los datos y corrígelos si hace falta antes de preparar el registro.',
        attachments: [{ kind: 'document_extraction', ...data }],
      });
      return true;
    } catch (err) {
      // el servidor responde en español (foto muy pesada, formato no admitido, sin permiso, saturado…)
      const content = err?.status && err?.message ? err.message : (err?.message || 'No se pudo leer el documento. Inténtalo con otra foto.');
      push({ role: 'assistant', content, isError: true });
      return false;
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setStatus('');
    }
  }, []);

  const settleAction = useCallback((id, outcome) => {
    setSettledActions((prev) => new Set(prev).add(id));
    if (outcome) setActionOutcomes((prev) => new Map(prev).set(id, outcome));
  }, []);

  /** Empieza de cero: mensajes nuevos y sin conversación guardada asociada. */
  const reset = useCallback((nextMessages = []) => {
    conversationRef.current = null;
    setConversationId(null);
    setSettledActions(new Set());
    setActionOutcomes(new Map());
    setMessages(nextMessages);
  }, []);

  /** Abre una conversación guardada para continuarla. Devuelve false si no se pudo cargar. */
  const openConversation = useCallback(async (id) => {
    if (loadingRef.current) return false;
    try {
      const res = await apiService.getAiConversation(id);
      const stored = res?.data?.messages ?? [];
      conversationRef.current = id;
      setConversationId(id);
      setMessages(stored.map((m) => ({ id: nextId(), role: m.role, content: m.content, attachments: m.attachments ?? [], ...(m.is_error ? { isError: true } : {}) })));
      return true;
    } catch {
      return false;
    }
  }, []);

  return { messages, loading, status, conversationId, settledActions, actionOutcomes, settleAction, send, reset, openConversation, readDocument };
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
