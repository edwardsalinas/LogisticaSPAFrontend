import { chromium } from '@playwright/test';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { USERS } from './users.js';

const API = process.env.E2E_API_URL || 'http://localhost:3000/api';
const MIN_API_LIMIT = 5000; // por debajo, una corrida completa agota el límite del servidor
const AUTH_MAX_AGE_MS = 25 * 60 * 1000; // una sesión guardada más vieja se renueva

/**
 * Antes de empezar: ¿el servidor responde y tiene los límites relajados para pruebas? Con los de producción (600 solicitudes cada
 * 15 minutos por IP) las páginas reciben «429» a mitad de la corrida y las pruebas fallan sin un error real. Solo avisa: no impide correr.
 */
const checkBackend = async () => {
  try {
    const res = await fetch(`${API}/logistics/packages`, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
    const policy = res.headers.get('ratelimit-policy') ?? ''; // «600;w=900»
    const limit = Number(policy.split(';')[0]);
    if (Number.isFinite(limit) && limit < MIN_API_LIMIT) {
      console.warn(`\n⚠ El servidor limita a ${limit} solicitudes cada 15 minutos: una corrida completa lo supera y fallarán pruebas sin un error real.`
        + '\n  Arráncalo con los límites de pruebas:  cd ../LogisticaSPABackend && npm run start:e2e\n');
    }
  } catch {
    throw new Error(`No se pudo conectar con el backend (${API}). Arráncalo con: cd ../LogisticaSPABackend && npm run start:e2e`);
  }
};

const authFresh = () => Object.keys(USERS).every((role) => {
  const file = `.e2e-auth/${role}.json`;
  return existsSync(file) && Date.now() - statSync(file).mtimeMs < AUTH_MAX_AGE_MS;
});

/**
 * Inicia sesión UNA vez por rol, por la interfaz real, y guarda la sesión (cookies httpOnly y localStorage).
 * Las pruebas la reutilizan: iniciar sesión en cada prueba supera el límite de intentos por IP de Supabase Auth.
 * Con E2E_REUSE_AUTH=1 (lo usa el ejecutor por tandas: `npm run e2e:tandas`) se reutilizan las sesiones guardadas hace menos de
 * 25 minutos, para no iniciar sesión de nuevo en cada archivo.
 */
export default async function globalSetup(config) {
  await checkBackend();
  mkdirSync('.e2e-auth', { recursive: true });
  if (process.env.E2E_REUSE_AUTH === '1' && authFresh()) return;

  const baseURL = config.projects[0].use.baseURL;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  for (const [role, { email, password }] of Object.entries(USERS)) {
    const context = await browser.newContext({ baseURL, locale: 'es-BO' });
    const page = await context.newPage();
    await page.goto('/login');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.locator('button[type="submit"]').click();
    try {
      await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20_000 });
    } catch {
      const msg = await page.locator('div.bg-red-50').innerText().catch(() => 'sin mensaje');
      await browser.close();
      throw new Error(`No se pudo iniciar sesión como ${role} (${email}): ${msg}`);
    }
    await context.storageState({ path: `.e2e-auth/${role}.json` });
    await context.close();
  }
  await browser.close();
}
