import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { USERS } from './users.js';

/**
 * Inicia sesión UNA vez por rol, por la interfaz real, y guarda la sesión (cookies httpOnly y localStorage).
 * Las pruebas la reutilizan: iniciar sesión en cada prueba supera el límite de intentos por IP de Supabase Auth.
 */
export default async function globalSetup(config) {
  const baseURL = config.projects[0].use.baseURL;
  mkdirSync('e2e-results/auth', { recursive: true });
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
    await context.storageState({ path: `e2e-results/auth/${role}.json` });
    await context.close();
  }
  await browser.close();
}
