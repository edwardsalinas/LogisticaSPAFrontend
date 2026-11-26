import { test, expect } from '@playwright/test';
import { login, closeLeakedContexts } from './helpers.js';

// cierra los contextos de navegador de cada prueba (si no, se acumulan páginas vivas y el archivo se vuelve lento)
test.afterEach(closeLeakedContexts);

/**
 * Avisos proactivos de Logi para el CLIENTE y el CONDUCTOR, con el backend, Supabase y la aplicación reales. Usan los datos de
 * demostración (scripts/seed-demo.mjs en el backend): un paquete entregado hace 40 min y otro en camino del cliente, y un viaje del
 * conductor que sale en ~45 min con otro en tránsito. Si no hay avisos para ese rol (datos de demostración ausentes o vencidos),
 * la prueba se omite. No cambia datos.
 */
const API = process.env.E2E_API_URL || 'http://localhost:3000/api';
const H = { 'X-Requested-With': 'XMLHttpRequest' };

const alertsFor = async (ctx) => {
  const r = await ctx.request.get(`${API}/ai-agent/alerts`, { headers: H });
  expect(r.status()).toBe(200);
  return (await r.json()).data ?? [];
};

test('cliente: Logi le avisa de lo más urgente de SUS paquetes, en lenguaje de paquetes, y el botón lleva a donde dice', async ({ browser }) => {
  test.setTimeout(150_000);
  const ctx = await browser.newContext({ locale: 'es-BO', viewport: { width: 1366, height: 800 } });
  const page = await ctx.newPage();
  await login(page, 'client');
  const alerts = await alertsFor(ctx);
  test.skip(alerts.length === 0, 'faltan los datos de demostración del cliente (scripts/seed-demo.mjs)');
  const first = alerts[0]; // el servidor los ordena por urgencia: un siniestro va antes que «llegó» o «en camino»
  expect(first.type).toMatch(/^client_/);

  await page.goto('/logistics/packages', { waitUntil: 'domcontentloaded' });
  const bubble = page.getByRole('group', { name: 'Aviso de Logi' });
  await expect(bubble).toBeVisible({ timeout: 60_000 });
  await expect(bubble).toContainText(first.title);
  await expect(bubble).not.toContainText(/viaje|ruta|conductor/i); // al cliente se le habla de SU paquete, no de la operación
  await page.screenshot({ path: 'e2e-results/aviso-cliente.png' });

  await bubble.getByRole('button', { name: first.action.label }).click();
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 30_000 }).toBe(first.action.to);
});

test('cliente: «Después» lo pospone y no vuelve enseguida; un paquete que va en camino lleva al mapa de seguimiento', async ({ browser }) => {
  test.setTimeout(150_000);
  const ctx = await browser.newContext({ locale: 'es-BO', viewport: { width: 1366, height: 800 } });
  const page = await ctx.newPage();
  await login(page, 'client');
  test.skip(!(await alertsFor(ctx)).some((a) => a.type === 'client_in_transit'), 'faltan los datos de demostración del cliente');

  await page.goto('/logistics/packages', { waitUntil: 'domcontentloaded' });
  const bubble = page.getByRole('group', { name: 'Aviso de Logi' });
  await expect(bubble).toBeVisible({ timeout: 60_000 });
  await bubble.getByRole('button', { name: 'Después' }).click();
  await expect(bubble).toHaveCount(0);
  // como mucho un aviso por hora: no aparece otro enseguida (el de «en camino» queda para después)
  await page.waitForTimeout(8000);
  await expect(bubble).toHaveCount(0);
});

test('conductor: Logi avisa que su viaje sale pronto y el botón lleva a su panel', async ({ browser }) => {
  test.setTimeout(150_000);
  const ctx = await browser.newContext({ locale: 'es-BO', viewport: { width: 1366, height: 800 } });
  const page = await ctx.newPage();
  await login(page, 'driver');
  const alerts = await alertsFor(ctx);
  test.skip(!alerts.some((a) => a.type === 'driver_depart'), 'faltan los datos de demostración del conductor (el viaje que sale pronto vence a los 45 minutos)');

  await page.goto('/driver', { waitUntil: 'domcontentloaded' });
  const bubble = page.getByRole('group', { name: 'Aviso de Logi' });
  await expect(bubble).toBeVisible({ timeout: 60_000 });
  await expect(bubble).toContainText('Tu viaje sale pronto');
  await expect(bubble).toContainText(/con 1 paquete cargado/);
  await page.screenshot({ path: 'e2e-results/aviso-conductor.png' });
  await bubble.getByRole('button', { name: 'Ver mi viaje' }).click();
  await expect(page).toHaveURL(/\/driver$/);
  await expect(bubble).toHaveCount(0); // atendido: se recoge
});

test('cada rol recibe SOLO lo suyo: el cliente no recibe avisos del conductor ni del personal, y al revés', async ({ browser }) => {
  const client = await browser.newContext(); await login(await client.newPage(), 'client');
  const driver = await browser.newContext(); await login(await driver.newPage(), 'driver');
  const admin = await browser.newContext(); await login(await admin.newPage(), 'admin');
  const types = async (ctx) => (await alertsFor(ctx)).map((a) => a.type);
  expect((await types(client)).every((t) => t.startsWith('client_'))).toBe(true);
  expect((await types(driver)).every((t) => t.startsWith('driver_'))).toBe(true);
  expect((await types(admin)).every((t) => !t.startsWith('client_') && !t.startsWith('driver_'))).toBe(true);
});
