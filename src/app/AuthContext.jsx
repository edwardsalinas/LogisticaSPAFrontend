import { createContext, useContext, useState, useEffect } from 'react';
import api, { SESSION_HINT_KEY } from '../services/api';

const AuthContext = createContext(null);

/**
 * Contexto de autenticación (React Context API).
 * La identidad la gestiona Supabase Auth; el backend entrega la sesión en cookies httpOnly,
 * por lo que aquí solo se guarda el usuario (nunca el token).
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Solo se consulta la sesión si hubo un login previo en este navegador.
    if (!localStorage.getItem(SESSION_HINT_KEY)) {
      setLoading(false);
      return;
    }
    api.get('/iam/profile')
      .then((res) => setUser(res.user))
      .catch(() => {
        localStorage.removeItem(SESSION_HINT_KEY);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password, captchaToken) => {
    const res = await api.post(
      '/iam/login',
      { email, password },
      captchaToken ? { headers: { 'x-captcha-token': captchaToken } } : undefined
    );
    localStorage.setItem(SESSION_HINT_KEY, '1');
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = async () => {
    try {
      await api.post('/iam/logout');
    } catch {
      // aunque falle la red, se limpia el estado local
    }
    localStorage.removeItem(SESSION_HINT_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
