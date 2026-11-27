import { test, expect } from '@playwright/test';
import { login, closeLeakedContexts } from './helpers.js';

test.afterEach(closeLeakedContexts);

/**
 * Logi deja la pantalla como se le pidió (escribiendo en el chat): abre la pantalla, la pestaña y filtra la tabla. La respuesta del
 * asistente se simula (la orden llega como adjunto ui_command, igual que la manda el servidor): aquí se prueba lo que hace el navegador
 * con ella, sin gastar consultas del modelo gratuito. La herramienta del servidor tiene sus propias pruebas.
 */
const mockChat = (page, attachments, response) => page.route('**/api/ai-agent/chat**', (route) => route.fulfill({
  status: 200, contentType: 'application/json',
  body: JSON.stringify({ success: true, data: { response, attachments, model: 'test' }, response, attachments }),
}));

const ask = async (page, text) => {
  await page.getByRole('button', { name: /abrir asistente/i }).click();
  await page.getByRole('textbox').last().fill(text);
  await page.getByRole('button', { name: /enviar/i }).click();
};

test('«muéstrame los viajes de Oruro» escrito en el chat abre Viajes en lista y filtra', async ({ browser }) => {
  test.setTimeout(120_000);
  const ctx = await browser.newContext({ locale: 'es-BO', viewport: { width: 1366, height: 800 } });
  const page = await ctx.newPage();
  await login(page, 'admin');
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await mockChat(page, [{ kind: 'ui_command', page: 'routes', label: 'Viajes', search: 'Oruro' }], 'Listo, dejé Viajes filtrados por Oruro.');
  await ask(page, 'muéstrame los viajes de Oruro');
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 20_000 }).toBe('/logistics/routes');
  await expect(page.getByLabel('Buscar viaje o ruta')).toHaveValue('Oruro', { timeout: 30_000 });
});

test('«abre los conductores de la flota» cambia de pestaña y filtra; una pantalla que el rol no ve no se abre', async ({ browser }) => {
  test.setTimeout(120_000);
  const ctx = await browser.newContext({ locale: 'es-BO', viewport: { width: 1366, height: 800 } });
  const page = await ctx.newPage();
  await login(page, 'admin');
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await mockChat(page, [{ kind: 'ui_command', page: 'fleet', tab: 'drivers', search: 'Pérez' }], 'Listo.');
  await ask(page, 'conductores Pérez');
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 20_000 }).toBe('/fleet');
  await expect(page.locator('main').getByRole('searchbox').or(page.locator('main input[placeholder*="uscar"]')).first()).toHaveValue('Pérez', { timeout: 30_000 });
});

test('si el servidor pide una pantalla que el rol no ve, el navegador no navega', async ({ browser }) => {
  test.setTimeout(120_000);
  const ctx = await browser.newContext({ locale: 'es-BO', viewport: { width: 1366, height: 800 } });
  const page = await ctx.newPage();
  await login(page, 'client');
  await page.goto('/logistics/packages', { waitUntil: 'domcontentloaded' });
  await mockChat(page, [{ kind: 'ui_command', page: 'fleet' }], 'Listo.');
  await ask(page, 'muéstrame la flota');
  await expect(page.getByText('Listo.').first()).toBeVisible({ timeout: 20_000 });
  expect(new URL(page.url()).pathname).toBe('/logistics/packages');
});

test('«reportes de noviembre» abre Reportes con ese rango: la página pide esas fechas', async ({ browser }) => {
  test.setTimeout(120_000);
  const ctx = await browser.newContext({ locale: 'es-BO', viewport: { width: 1366, height: 800 } });
  const page = await ctx.newPage();
  await login(page, 'admin');
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await mockChat(page, [{ kind: 'ui_command', page: 'analytics', fields: { range: { from: '2026-11-01', to: '2026-11-26' } } }], 'Listo.');
  const asked = page.waitForRequest((r) => /\/analytics/.test(r.url()) && /from=2026-11-01/.test(r.url()) && /to=2026-11-26/.test(r.url()), { timeout: 60_000 });
  await ask(page, 'reportes de noviembre');
  await asked;
  expect(new URL(page.url()).pathname).toBe('/analytics');
});
