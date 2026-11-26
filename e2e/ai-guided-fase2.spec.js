import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { login } from './helpers.js';

/**
 * «Que Logi lo haga», fase 2 (asignar un paquete a un viaje y registrar un evento), con el backend y Supabase reales.
 * Logi lleva a cabo la acción a la vista de todos y se comprueba el resultado real en la API:
 *  - asignar: el paquete queda en el viaje pedido;
 *  - registrar evento: el paquete pasa al estado pedido.
 * El paquete de prueba lleva la marca E2E-<sello> (ids en e2e-results/created-guided2.json, ver e2e-cleanup).
 *
 * Qué se prueba aquí y qué NO: esta prueba verifica la COREOGRAFÍA (Logi llena el formulario a la vista, el usuario confirma y el servidor
 * aplica el cambio). La propuesta la prepara el servidor REAL por los mismos endpoints de los botones «Preparar…» (sin modelo de lenguaje);
 * solo se reemplaza la respuesta del chat para que la tarjeta aparezca. Antes la tarjeta dependía de que el modelo gratuito la pidiera, y
 * fallaba por su límite de uso o porque a veces dice «la preparé» sin prepararla: eso NO es un defecto de la coreografía. Que el modelo
 * convierta una frase en una propuesta se prueba aparte, con el modelo real (ai-actions, ai-acciones-flota y ai-voz-*).
 */
const STAMP = Date.now();
const TAG = `E2E-${STAMP}`;
const created = { tag: TAG, routeIds: [], packageIds: [] };
const API = process.env.E2E_API_URL || 'http://localhost:3000/api';
const H = { 'X-Requested-With': 'XMLHttpRequest' };
const save = () => writeFileSync('e2e-results/created-guided2.json', JSON.stringify(created, null, 2));
const state = {};

test.describe.configure({ mode: 'serial' });

/**
 * Pide la propuesta al servidor real (sin modelo) y hace que el chat la muestre como si el asistente la hubiera preparado: la respuesta del
 * chat en vivo se sustituye por un evento «final» con esa misma propuesta. Devuelve la acción para comprobarla.
 */
const proposeViaServer = async (page, ctx, path, data, question) => {
  const res = await ctx.request.post(`${API}${path}`, { headers: H, data });
  expect(res.status(), `el servidor debía preparar la propuesta: ${await res.text()}`).toBe(200);
  const proposal = (await res.json()).data;
  expect(proposal.kind).toBe('action_proposal');
  await page.route('**/ai-agent/chat/stream', (route) => route.fulfill({
    status: 200,
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    body: `data: ${JSON.stringify({ type: 'final', response: 'Preparé la propuesta. Revísala y confírmala.', attachments: [proposal], model: 'servidor', conversation_id: null })}

`,
  }));
  await page.getByLabel(/mensaje para el asistente/i).fill(question);
  await page.getByRole('button', { name: /^enviar$/i }).click();
  await expect(page.getByRole('button', { name: /que logi lo haga/i })).toBeVisible({ timeout: 30_000 });
  return proposal.action;
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

  const action = await proposeViaServer(page, ctx, '/ai-agent/suggestions/assign', { route_ref: state.route.id, codes: [state.code] }, `Prepara la asignación del paquete ${state.code}`);
  expect(action.type).toBe('assign_package');
  expect(action.ui.fill.form).toBe('assignment');
  expect(action.ui.fill.values.items.map((i) => i.tracking_code)).toEqual([state.code]);
  expect(action.ui.fill.values.route_text).toBe('La Paz → Municipio Caracollo');
  const chosenRouteId = action.ui.fill.values.route_id;
  expect(chosenRouteId).toBe(state.route.id);
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

  const action = await proposeViaServer(page, ctx, '/ai-agent/suggestions/event', { codes: [state.code], status: 'en_agencia' }, `Registra que el paquete ${state.code} está en agencia`);
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

test('3. con más de 3 paquetes Logi muestra los primeros y asigna todos con una sola confirmación', async ({ browser }) => {
  test.skip(!state.route, 'depende del paso 0');
  test.setTimeout(300_000);
  const ctx = await browser.newContext({ locale: 'es-BO', viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  await login(page, 'admin');
  const codes = [];
  for (let i = 1; i <= 5; i += 1) {
    const res = await ctx.request.post(`${API}/logistics/packages`, {
      headers: H,
      data: { origen: 'La Paz', destino: 'Municipio Caracollo', peso: 1, description: TAG, recipient_name: `${TAG} Destinatario ${i}`, sender_name: `${TAG} Remitente` },
    });
    expect(res.status(), await res.text()).toBe(201);
    const pkg = (await res.json()).data;
    created.packageIds.push(pkg.id);
    codes.push({ id: pkg.id, code: pkg.tracking_code });
  }
  save();

  await page.goto('/dashboard');
  await page.getByRole('button', { name: /abrir asistente/i }).click();
  const action = await proposeViaServer(page, ctx, '/ai-agent/suggestions/assign', { route_ref: state.route.id, codes: codes.map((c) => c.code) }, `Prepara la asignación de los paquetes ${codes.map((c) => c.code).join(', ')}`);
  expect(action.type).toBe('assign_package');
  expect(action.ui.fill.values.items).toHaveLength(5); // más de 3: se ofrece igual y Logi hace el resto de una vez
  const routeId = action.ui.fill.values.route_id;

  await page.getByRole('button', { name: /que logi lo haga/i }).click();
  await expect(page.locator('[data-logi-run]')).toHaveCount(1, { timeout: 15_000 });
  await expect(page.locator('[data-logi-active]').first()).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('[data-logi-run]')).toHaveCount(0, { timeout: 180_000 });

  const list = await (await ctx.request.get(`${API}/logistics/packages`, { headers: H })).json();
  const all = Array.isArray(list) ? list : list.data;
  for (const c of codes) expect(all.find((p) => p.id === c.id).route_id, `${c.code} debe quedar en el viaje`).toBe(routeId);
  await ctx.close();
});
