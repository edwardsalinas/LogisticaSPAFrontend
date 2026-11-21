import axios from 'axios';

/**
 * Cliente HTTP de la API.
 *
 * La sesión vive en cookies httpOnly emitidas por el backend (el JavaScript no puede leer el JWT),
 * por eso las peticiones se envían con `withCredentials`. El header `X-Requested-With` es la
 * protección CSRF que exige el backend en las peticiones que modifican datos.
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Indicador NO sensible (no es el token) para saber si vale la pena consultar la sesión al cargar.
export const SESSION_HINT_KEY = 'session_hint';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

const AUTH_PATHS = ['/iam/login', '/iam/refresh', '/iam/logout'];
const isAuthPath = (url = '') => AUTH_PATHS.some((p) => url.endsWith(p));

// Una sola renovación a la vez, aunque varias peticiones fallen con 401 al mismo tiempo.
let refreshPromise = null;
const refreshSession = () => {
  if (!refreshPromise) {
    refreshPromise = api
      .post('/iam/refresh')
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

api.interceptors.response.use(
  // Al desempaquetar response.data, compatibilizamos directamente con el comportamiento
  // anterior del fetch (data = await response.json(); return data;)
  (response) => response.data,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    if (status === 401 && original && !original._retry && !isAuthPath(original.url)) {
      original._retry = true;
      try {
        await refreshSession();
        return api(original); // reintenta la petición original con la sesión renovada
      } catch {
        // la renovación falló: la sesión terminó
      }
    }

    if (status === 401 && !isAuthPath(original?.url)) {
      localStorage.removeItem(SESSION_HINT_KEY);
      // La consulta inicial de sesión (/iam/profile) no debe redirigir: la maneja AuthContext.
      const isProfileCheck = (original?.url || '').endsWith('/iam/profile');
      if (!isProfileCheck && window.location.pathname !== '/login' && window.location.pathname !== '/public-tracking') {
        window.location.href = '/login';
      }
    }

    // Mantener la forma de Error para try-catch anteriores
    const message = error.response?.data?.message || error.message || 'Error en la petición';
    const wrapped = new Error(message);
    wrapped.status = status;
    wrapped.isNetworkError = !error.response; // sin respuesta del servidor: offline, timeout o DNS
    wrapped.code = error.response?.data?.code;
    wrapped.data = error.response?.data;
    return Promise.reject(wrapped);
  }
);

export default api;
