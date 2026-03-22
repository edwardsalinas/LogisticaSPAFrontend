import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    // Al desempaquetar response.data, compatibilizamos directamente con el comportamiento 
    // anterior del fetch (data = await response.json(); return data;)
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      console.warn('Unauthorized. Eliminando token y redirigiendo...');
      localStorage.removeItem('auth_token');
      // Prevenir bucles de redirección
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    // Mantener la forma de Error para try-catch anteriores
    const message = error.response?.data?.message || error.message || 'Error en la petición';
    return Promise.reject(new Error(message));
  }
);

export default api;
