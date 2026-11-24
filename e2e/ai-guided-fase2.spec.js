import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { login } from './helpers.js';

/**
 * «Que Logi lo haga», fase 2 (asignar un paquete a un viaje y registrar un evento), con el backend, Supabase y Gemini reales.
 * Logi lleva a cabo la acción a la vista de todos y se comprueba el resultado real en la API:
 *  - asignar: el paquete queda en el viaje pedido;
 *  - registrar evento: el paquete pasa al estado pedido.
 * El paquete de prueba lleva la marca E2E-<sello> (ids en e2e-results/created-guided2.json, ver e2e-cleanup).
 */
const STAMP = Date.now();
const TAG = `E2E-${STAMP}`;
const created = { tag: TAG, routeIds: [], packageIds: [] };
const API = process.env.E2E_API_URL || 'http://localhost:3000/api';
const H = { 'X-Requested-With': 'XMLHttpRequest' };
const save = () => writeFileSync('e2e-results/created-guided2.json', JSON.stringify(created, null, 2));
const state = {};

test.describe.configure({ mode: 'serial' });

/** Pregunta en el panel del asistente y devuelve la propuesta (la respuesta llega en vivo: se lee el evento «final»). */
const askForProposal = async (page, question) => {
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/ai-agent/chat') && r.request().method() === 'POST', { timeout: 120_000 }),
    (async () => {
      await page.getByLabel(/mensaje para el asistente/i).fill(question);
      await page.getByRole('button', { name: /^enviar$/i }).click();
    })(),
  ]);
  const events = (await response.text()).split(/\r?\n/).filter((l) => l.startsWith('data: ')).map((l) => JSON.parse(l.slice(6)));
  const body = events.find((e) => e.type === 'final');
  return { body, action: body?.attachments?.find((a) => a.kind === 'action_proposal')?.action };
};

const packageNow = async (ctx) => {
  const res = await ctx.request.get(`${API}/logistics/packages`, { headers: H });
  const body = await res.json();
  return (Array.isArray(body) ? body : body.data).find((p) => p.id === state.packageId);
};

test('0. prepara un paquete de prueba suelto hacia un viaje planeado', async ({ browser }) => {
  const ctx = await browser.newContext({ locale: 'es-BO' });
  const page = await ctx.newPage();
  await login(page, 'admin');
  const routesRes = await ctx.request.get(`${API}/logistics/routes`, { headers: H });
  const routes = (await routesRes.json()).data ?? [];
  const trip = routes.find((r) => r.status === 'planeada' && r.origin === 'La Paz' && r.destination === 'Municipio Caracollo');
  test.skip(!trip, 'no hay un viaje planeado La Paz → Municipio Caracollo para la prueba');
  state.route = trip;

  const res = await ctx.request.post(`${API}/logistics/packages`, {
    headers: H,
    data: { origen: 'La Paz', destino: 'Municipio Caracollo', peso: 1, description: TAG, recipient_name: `${TAG} Destinatario`, sender_name: `${TAG} Remitente` },
  });
  expect(res.status(), await res.text()).toBe(201);
  const pkg = (await res.json()).data;
  state.packageId = pkg.id;
  state.code = pkg.tracking_code;
  created.packageIds.push(pkg.id);
  save();
  await ctx.close();
});

test('1. Logi asigna el paquete al viaje a la vista de todos', async ({ browser }) => {
  test.skip(!state.packageId, 'depende del paso 0');
  test.setTimeout(240_000);
  const ctx = await browser.newContext({ locale: 'es-BO', viewport: { width: 1366, height: 800 } });
  const page = await ctx.newPage();
  await login(page, 'admin');
  await page.goto('/dashboard');
  await page.getByRole('button', { name: /abrir asistente/i }).click();

  const { body, action } = await askForProposal(page, `Asigna el paquete ${state.code} al viaje de La Paz a Municipio Caracollo`);
  expect(action, `el asistente debía proponer asignar. Respuesta: ${body?.response}`).toBeTruthy();
  expect(action.type).toBe('assign_package');
  expect(action.ui.fill.form).toBe('assignment');
  expect(action.ui.fill.values.items.map((i) => i.tracking_code)).toEqual([state.code]);
  expect(action.ui.fill.values.route_text).toBe('La Paz → Municipio Caracollo');
  const chosenRouteId = action.ui.fill.values.route_id; // el viaje que eligió el asistente entre los planeados
  expect((await packageNow(ctx)).route_id, 'la propuesta no asigna nada todavía').toBeFalsy();

  await page.getByRole('button', { name: /que logi lo haga/i }).click();
  await expect(page.locator('[data-logi-run]')).toHaveCount(1, { timeout: 15_000 });
  await expect(page.locator('[data-logi-active]').first()).toBeVisible({ timeout: 60_000 }); // Logi llegó a un campo
  await expect(page.locator('[data-logi-run]')).toHaveCount(0, { timeout: 120_000 });
  await expect(page).toHaveURL(/\/logistics\/packages$/);

  const after = await packageNow(ctx);
  expect(after.route_id, 'el paquete debe quedar en el viaje de la propuesta').toBe(chosenRouteId);
  await ctx.close();
});

test('2. Logi registra un evento a la vista de todos', async ({ browser }) => {
  test.skip(!state.packageId, 'depende del paso 0');
  test.setTimeout(240_000);
  const ctx = await browser.newContext({ locale: 'es-BO', viewport: { width: 1366, height: 800 } });
  const page = await ctx.newPage();
  await login(page, 'admin');
  await page.goto('/dashboard');
  await page.getByRole('button', { name: /abrir asistente/i }).click();

  const { body, action } = await askForProposal(page, `Registra que el paquete ${state.code} está en agencia`);
  expect(action, `el asistente debía proponer el evento. Respuesta: ${body?.response}`).toBeTruthy();
  expect(action.type).toBe('register_tracking_event');
  expect(action.ui.fill.form).toBe('event');
  expect(action.ui.fill.values.status).toBe('en_agencia');
  const before = await packageNow(ctx);
  expect(before.status, 'la propuesta no cambia nada todavía').not.toBe('en_agencia');

  await page.getByRole('button', { name: /que logi lo haga/i }).click();
  await expect(page.locator('[data-logi-run]')).toHaveCount(1, { timeout: 15_000 });
  await expect(page.locator('[data-logi-active]').first()).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('[data-logi-run]')).toHaveCount(0, { timeout: 120_000 });
  await expect(page).toHaveURL(/\/tracking$/);

  expect((await packageNow(ctx)).status).toBe('en_agencia');
  await ctx.close();
});
