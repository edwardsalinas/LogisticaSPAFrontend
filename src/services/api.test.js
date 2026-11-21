import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AxiosError } from 'axios';
import api, { SESSION_HINT_KEY } from './api';

const respond = (config, status, data = {}) => {
  const response = { data, status, statusText: String(status), headers: {}, config };
  if (status >= 400) return Promise.reject(new AxiosError(`HTTP ${status}`, 'ERR_BAD_REQUEST', config, null, response));
  return Promise.resolve(response);
};

let originalAdapter;
beforeEach(() => {
  originalAdapter = api.defaults.adapter;
  localStorage.setItem(SESSION_HINT_KEY, '1');
  // En /login el interceptor no redirige (evita navegación real en jsdom)
  window.history.pushState({}, '', '/login');
});
afterEach(() => {
  api.defaults.adapter = originalAdapter;
});

describe('cliente HTTP con sesión por cookie', () => {
  it('envía credenciales y el header anti-CSRF', async () => {
    let seen;
    api.defaults.adapter = async (config) => {
      seen = config;
      return respond(config, 200, { ok: true });
    };
    await api.get('/x');
    expect(api.defaults.withCredentials).toBe(true);
    expect(seen.headers['X-Requested-With']).toBe('XMLHttpRequest');
    expect(seen.headers.Authorization).toBeUndefined(); // el token nunca pasa por JavaScript
  });

  it('ante un 401 renueva la sesión una vez y reintenta la petición original', async () => {
    const calls = [];
    let first = true;
    api.defaults.adapter = async (config) => {
      calls.push(config.url);
      if (config.url === '/iam/refresh') return respond(config, 200, { success: true });
      if (config.url === '/datos' && first) {
        first = false;
        return respond(config, 401);
      }
      return respond(config, 200, { datos: [1, 2] });
    };

    const result = await api.get('/datos');
    expect(result).toEqual({ datos: [1, 2] });
    expect(calls).toEqual(['/datos', '/iam/refresh', '/datos']);
  });

  it('si la renovación falla, rechaza con status 401 y limpia el indicador de sesión', async () => {
    api.defaults.adapter = async (config) => respond(config, 401);
    await expect(api.get('/datos')).rejects.toMatchObject({ status: 401 });
    expect(localStorage.getItem(SESSION_HINT_KEY)).toBeNull();
  });

  it('marca los errores de red para poder encolar puntos GPS offline', async () => {
    api.defaults.adapter = async (config) => Promise.reject(new AxiosError('Network Error', 'ERR_NETWORK', config, null, undefined));
    await expect(api.post('/tracking/trip/1/event', {})).rejects.toMatchObject({ isNetworkError: true });
  });

  it('propaga código y datos de error del backend (captcha / rate limit)', async () => {
    api.defaults.adapter = async (config) => respond(config, 429, { code: 'RATE_LIMITED', message: 'Demasiados intentos' });
    await expect(api.post('/iam/login', {})).rejects.toMatchObject({ status: 429, code: 'RATE_LIMITED', message: 'Demasiados intentos' });
  });
});
