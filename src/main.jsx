import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './app/App';
import { API_BASE_URL } from './services/api';
import { saveMeta } from './services/offlineQueue';
import './styles/index.css';

async function enableMocking() {
  // MSW temporalmente desactivado para conectar directamente con LogisticaSPABackend
  return;
}

// Service worker: vacía la cola offline de puntos GPS con Background Sync (ver public/sw.js).
// Se registra solo en producción/preview para no interferir con el HMR de Vite.
function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  window.addEventListener('load', async () => {
    try {
      await saveMeta('apiBaseUrl', API_BASE_URL); // el worker necesita saber a dónde enviar
      await navigator.serviceWorker.register('/sw.js');
    } catch (err) {
      console.warn('[SW] No se pudo registrar el service worker:', err);
    }
  });
}

enableMocking().then(() => {
  registerServiceWorker();
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
});
