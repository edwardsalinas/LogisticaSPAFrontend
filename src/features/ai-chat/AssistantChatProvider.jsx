import { useEffect } from 'react';
import { useAuth } from '../../app/AuthContext';
import { ChatContext, useChatState } from './useAssistantChat';

/**
 * Mantiene UNA conversación con el asistente mientras la aplicación está abierta: al ir de una pantalla a otra
 * (o abrir el panel flotante) no se pierde. Se borra al cambiar de usuario o cerrar sesión, para que quien use
 * el mismo navegador después no vea la conversación anterior.
 */
export function AssistantChatProvider({ children }) {
  const { user } = useAuth();
  const chat = useChatState([]);
  const userId = user?.id ?? null;

  useEffect(() => {
    chat.reset([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe reiniciarse al cambiar de usuario
  }, [userId]);

  return <ChatContext.Provider value={chat}>{children}</ChatContext.Provider>;
}
