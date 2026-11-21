import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

/**
 * "Modo IA": preferencia del usuario (por defecto desactivada, la aplicación se ve como siempre).
 * Activada, la aplicación abre directamente en el asistente conversacional y el resto de pantallas
 * quedan disponibles desde el menú. Se guarda en el navegador, una preferencia por usuario.
 */
const storageKey = (userId) => `logistica:ai-mode:${userId || 'anon'}`;

const read = (userId) => {
  try {
    return window.localStorage.getItem(storageKey(userId)) === '1';
  } catch {
    return false; // sin almacenamiento (modo privado, bloqueado): se queda en el modo clásico
  }
};

const write = (userId, value) => {
  try {
    window.localStorage.setItem(storageKey(userId), value ? '1' : '0');
  } catch {
    /* sin almacenamiento: la preferencia vale solo para esta sesión */
  }
};

const AiModeContext = createContext({ aiMode: false, setAiMode: () => {}, toggleAiMode: () => {} });

export function AiModeProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [aiMode, setAiModeState] = useState(() => read(userId));

  // Al iniciar sesión (o cambiar de usuario) se carga la preferencia de ese usuario
  useEffect(() => {
    setAiModeState(read(userId));
  }, [userId]);

  const setAiMode = useCallback(
    (value) => {
      const next = Boolean(value);
      setAiModeState(next);
      write(userId, next);
    },
    [userId]
  );

  const toggleAiMode = useCallback(() => setAiMode(!aiMode), [aiMode, setAiMode]);
  const value = useMemo(() => ({ aiMode, setAiMode, toggleAiMode }), [aiMode, setAiMode, toggleAiMode]);

  return <AiModeContext.Provider value={value}>{children}</AiModeContext.Provider>;
}

export const useAiMode = () => useContext(AiModeContext);
