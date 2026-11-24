import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { login } from './helpers.js';

/**
 * «Que Logi lo haga»: con el backend, Supabase y Gemini reales. El asistente propone crear un paquete y Logi lo hace a la
 * vista de todos (va a Paquetes, abre el formulario, lo llena y confirma). Se comprueba que:
 *  - si se le detiene a mitad, NO se crea nada y no queda el formulario a medias;
 *  - si se le deja terminar, se crea UN solo paquete con los datos de la propuesta y la tarjeta queda en «Hecho».
 * Los datos creados llevan la marca E2E-<sello> (ids en e2e-results/created-guided.json, ver e2e-cleanup).
 */
const STAMP = Date.now();
const TAG = `E2E-${STAMP}`;
const created = { tag: TAG, routeIds: [], packageIds: [] };
const API = process.env.E2E_API_URL || 'http://localhost:3000/api';
const H = { 'X-Requested-With': 'XMLHttpRequest' };
const save = () => writeFileSync('e2e-results/created-guided.json', JSON.stringify(created, null, 2));

const myPackages = async (ctx) => {
  const res = await ctx.request.get(`${API}/logistics/packages`, { headers: H });
  expect(res.status()).toBe(200);
  const body = await res.json();
  return (Array.isArray(body) ? body : body.data).filter((p) => (p.recipient_name || '').startsWith(TAG));
};

test('Logi crea un paquete a la vista de todos; detenerlo no crea nada y terminarlo crea uno solo', async ({ browser }) => {
  test.setTimeout(240_000);
  const ctx = await browser.newContext({ locale: 'es-BO', viewport: { width: 1366, height: 800 } });
  const page = await ctx.newPage();
  await login(page, 'admin');
  await page.goto('/dashboard');
  await page.getByRole('button', { name: /abrir asistente/i }).click();

  // el asistente propone (la respuesta llega en vivo: se lee el evento «final»)
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/ai-agent/chat') && r.request().method() === 'POST', { timeout: 120_000 }),
    (async () => {
      await page.getByLabel(/mensaje para el asistente/i).fill(`Crea un paquete de La Paz a Oruro de 3 kg para el destinatario "${TAG} Destinatario" con la descripción ${TAG}`);
      await page.getByRole('button', { name: /^enviar$/i }).click();
    })(),
  ]);
  const events = (await response.text()).split(/\r?\n/).filter((l) => l.startsWith('data: ')).map((l) => JSON.parse(l.slice(6)));
  const action = events.find((e) => e.type === 'final')?.attachments?.find((a) => a.kind === 'action_proposal')?.action;
  expect(action, 'el asistente debía proponer crear el paquete').toBeTruthy();
  // la propuesta trae los datos estructurados para que Logi llene el formulario (sin datos internos)
  expect(action.ui.fill.values).toMatchObject({ origen: 'La Paz', destino: 'Oruro', peso: 3 });
  expect(action.ui.fill.values.recipient_name).toContain(TAG);
  expect(JSON.stringify(action)).not.toContain('params');

  const guided = page.getByRole('button', { name: /que logi lo haga/i });
  await expect(guided).toBeVisible({ timeout: 60_000 });

  // 1) Se le detiene a mitad: no se crea nada, el formulario se cierra y la tarjeta sigue pendiente
  await guided.click();
  await expect(page.locator('[data-logi-active]')).toBeVisible({ timeout: 40_000 });
  await page.getByRole('button', { name: /^detener$/i }).click();
  await expect(page.locator('[data-logi-run]')).toHaveCount(0);
  await expect(page.locator('[role=dialog]')).toHaveCount(0);
  expect(await myPackages(ctx), 'detenido: no debe haber creado nada').toHaveLength(0);
  await page.getByRole('button', { name: /abrir asistente/i }).click();
  await expect(page.getByRole('button', { name: /^confirmar$/i })).toBeEnabled();

  // 2) Se le deja terminar: un solo paquete, con los datos de la propuesta
  await page.getByRole('button', { name: /que logi lo haga/i }).click();
  await expect(page.locator('[data-logi-run]')).toHaveCount(1, { timeout: 15_000 });
  await expect(page.locator('[data-logi-run]')).toHaveCount(0, { timeout: 90_000 });
  await expect(page).toHaveURL(/\/logistics\/packages$/);

  const made = await myPackages(ctx);
  expect(made, 'debe haberse creado exactamente un paquete').toHaveLength(1);
  created.packageIds.push(made[0].id);
  save();
  expect(made[0]).toMatchObject({ origen: 'La Paz', destino: 'Oruro' });
  expect(Number(made[0].peso)).toBe(3);

  // al reabrir el chat, la tarjeta ya está resuelta (no se puede confirmar otra vez)
  await page.getByRole('button', { name: /abrir asistente/i }).click();
  await expect(page.getByText(/^hecho$/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /^confirmar$/i })).toHaveCount(0);
  await ctx.close();
});
