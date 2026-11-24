import { useEffect, useRef } from 'react';
import { useAuth } from '../../app/AuthContext';
import { ChatContext, useChatState } from './useAssistantChat';

const KEY = (userId) => `logisticaspa:asistente:conversacion:${userId}`;

const readSaved = (userId) => {
  try { return window.sessionStorage.getItem(KEY(userId)); } catch { return null; }
};
const writeSaved = (userId, id) => {
  try {
    if (id) window.sessionStorage.setItem(KEY(userId), id);
    else window.sessionStorage.removeItem(KEY(userId));
  } catch { /* sin almacenamiento: la conversación sigue, solo no sobrevive a recargar */ }
};

/**
 * Mantiene UNA conversación con el asistente mientras la aplicación está abierta: al ir de una pantalla a otra
 * (o abrir el panel flotante) no se pierde. También sobrevive a recargar la pestaña: solo se guarda el IDENTIFICADOR
 * de la conversación (el contenido ya vive en el servidor, ligado al usuario) y al volver se reabre desde allí.
 * Se borra al cambiar de usuario o cerrar sesión, para que quien use el mismo navegador después no vea la anterior.
 */
export function AssistantChatProvider({ children }) {
  const { user } = useAuth();
  const chat = useChatState([]);
  const userId = user?.id ?? null;
  const prevUserId = useRef(userId);
  const hydrating = useRef(false); // mientras se reabre la conversación guardada no se debe borrar su identificador

  useEffect(() => {
    // al cerrar sesión se olvida la conversación de ese usuario en esta pestaña
    if (prevUserId.current && prevUserId.current !== userId) writeSaved(prevUserId.current, null);
    prevUserId.current = userId;
    chat.reset([]);
    const saved = userId ? readSaved(userId) : null;
    if (!userId || !saved) return undefined;

    let cancelled = false;
    hydrating.current = true;
    chat.openConversation(saved).then((ok) => {
      if (!ok && !cancelled) writeSaved(userId, null); // ya no existe o no se pudo leer: se empieza de cero
    }).finally(() => { if (!cancelled) hydrating.current = false; });
    return () => { cancelled = true; hydrating.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe reiniciarse al cambiar de usuario
  }, [userId]);

  // Cada vez que la conversación activa cambia (se crea, se abre otra o se pulsa "Nueva conversación") se recuerda
  useEffect(() => {
    if (!userId || hydrating.current) return;
    writeSaved(userId, chat.conversationId);
  }, [userId, chat.conversationId]);

  return <ChatContext.Provider value={chat}>{children}</ChatContext.Provider>;
}
