import { readFileSync } from 'node:fs';
import { USERS } from './users.js';

/**
 * Entra como un rol reutilizando la sesión que guardó global-setup.js (un único inicio de sesión real por rol).
 * Así las pruebas no superan el límite de intentos de Supabase Auth.
 */
export async function login(page, role) {
  const state = JSON.parse(readFileSync(`.e2e-auth/${role}.json`, 'utf8'));
  await page.context().addCookies(state.cookies);
  for (const origin of state.origins ?? []) {
    await page.addInitScript(({ url, items }) => {
      if (location.origin === url) for (const { name, value } of items) localStorage.setItem(name, value);
    }, { url: origin.origin, items: origin.localStorage });
  }
  await page.goto('/');
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20_000 });
}

/** Inicia sesión por la interfaz y espera a salir de /login (úsese solo en las pruebas del propio login). */
export async function loginViaUI(page, role) {
  const { email, password } = USERS[role];
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20_000 });
}

// Ruido conocido que no es un fallo de la aplicación
const IGNORED_CONSOLE = [/favicon/i, /Download the React DevTools/i, /\[vite\]/i];
const IGNORED_URLS = [/tile\.openstreetmap|tiles\.|basemaps|cartocdn|googleapis\.com\/css|fonts\.g/i];

/** Recoge errores de consola, excepciones de la página y respuestas de la API con error. */
export function watchProblems(page) {
  const problems = [];
  page.on('pageerror', (e) => problems.push(`EXCEPCIÓN: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !IGNORED_CONSOLE.some((r) => r.test(m.text()))) problems.push(`CONSOLA: ${m.text().slice(0, 200)}`);
  });
  page.on('response', (r) => {
    const url = r.url();
    if (IGNORED_URLS.some((rx) => rx.test(url))) return;
    if (url.includes('/api/') && r.status() >= 400) problems.push(`API ${r.status()}: ${r.request().method()} ${url.replace(/^https?:\/\/[^/]+/, '')}`);
  });
  page.on('requestfailed', (r) => {
    if (!IGNORED_URLS.some((rx) => rx.test(r.url())) && r.failure()?.errorText !== 'net::ERR_ABORTED') problems.push(`RED: ${r.url().slice(0, 120)} (${r.failure()?.errorText})`);
  });
  return problems;
}

/** Visita una ruta, espera a que se estabilice y devuelve el texto visible principal. */
export async function visit(page, path, shot) {
  await page.goto(path);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  if (shot) await page.screenshot({ path: `e2e-results/shots/${shot}.png`, fullPage: true });
  return page.locator('body').innerText();
}

/**
 * Abre una pantalla y espera a que muestre algo concreto (`ready` recibe la página y devuelve el localizador esperado). Si la página
 * queda en blanco o tarda (el servidor de desarrollo compila en frío; con el equipo corto de memoria pasa a veces), repite la
 * navegación hasta 90 segundos en vez de fallar por una carga lenta. No espera el evento «load»: los mapas cargan teselas externas.
 */
export async function openScreen(page, path, ready, { timeout = 90_000 } = {}) {
  const { expect } = await import('@playwright/test');
  await expect(async () => {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(ready(page)).toBeVisible({ timeout: 15_000 });
  }).toPass({ timeout });
}

/**
 * Para `test.afterEach(closeLeakedContexts)`: cierra los contextos de navegador que la prueba creó con `browser.newContext()`.
 * Playwright NO los cierra solo (solo cierra el de la fixture `page`): cada prueba dejaba una página viva con sus consultas periódicas,
 * mapas y conexiones abiertas, y dentro de un mismo archivo el navegador se iba saturando (la cuarta prueba se quedaba en blanco o
 * colgada). Si la prueba falló, antes guarda una captura de cada página para poder ver qué pasó.
 */
export async function closeLeakedContexts({ browser }, testInfo) {
  const failed = testInfo.status !== testInfo.expectedStatus;
  let n = 0;
  for (const context of browser.contexts()) {
    if (failed) {
      for (const page of context.pages()) {
        n += 1;
        await page.screenshot({ path: testInfo.outputPath(`pagina-${n}.png`) }).catch(() => {});
      }
    }
    await context.close().catch(() => {});
  }
}
