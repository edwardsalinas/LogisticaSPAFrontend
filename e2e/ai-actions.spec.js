import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { login } from './helpers.js';

/**
 * Acciones del asistente CON CONFIRMACIÓN, con el backend, Supabase y Gemini reales:
 * el asistente propone, nada cambia hasta que el usuario pulsa Confirmar, y solo el dueño puede confirmar.
 * Los datos creados llevan la marca E2E-<sello> (ids en e2e-results/created-actions.json, ver e2e-cleanup).
 */
const STAMP = Date.now();
const TAG = `E2E-${STAMP}`;
const created = { tag: TAG, routeIds: [], packageIds: [] };
const state = {};
const API = process.env.E2E_API_URL || 'http://localhost:3000/api';
const H = { 'X-Requested-With': 'XMLHttpRequest' };
const save = () => writeFileSync('e2e-results/created-actions.json', JSON.stringify(created, null, 2));

const enableAiMode = async (page) => {
  await page.goto('/');
  const toggle = page.getByRole('switch', { name: /modo ia/i });
  await expect(toggle).toBeVisible({ timeout: 20_000 });
  if ((await toggle.getAttribute('aria-checked')) !== 'true') await toggle.click();
  await expect(page.getByRole('heading', { name: /hola, /i })).toBeVisible({ timeout: 20_000 });
};

/** Envía una pregunta y devuelve el resultado final (con las propuestas). El chat responde en vivo (SSE): se lee el evento "final". */
const ask = async (page, question) => {
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/ai-agent/chat') && r.request().method() === 'POST', { timeout: 120_000 }),
    (async () => {
      await page.getByLabel(/mensaje para el asistente/i).fill(question);
      await page.getByRole('button', { name: /^enviar$/i }).click();
    })(),
  ]);
  expect(response.status(), await response.text()).toBe(200);
  const events = (await response.text()).split(/\r?\n/).filter((l) => l.startsWith('data: ')).map((l) => JSON.parse(l.slice(6)));
  const body = events.find((e) => e.type === 'final');
  expect(body, 'el chat debe terminar con un evento final: ' + JSON.stringify(events.slice(-2))).toBeTruthy();
  await expect(page.locator('p:not(.sr-only)').filter({ hasText: /consultando…/i })).toBeHidden({ timeout: 30_000 });
  return body;
};

const proposalOf = (body) => (body.attachments || []).find((a) => a.kind === 'action_proposal')?.action;

const packagesAs = async (ctx) => {
  const res = await ctx.request.get(`${API}/logistics/packages`, { headers: H });
  expect(res.status()).toBe(200);
  const body = await res.json();
  return Array.isArray(body) ? body : body.data;
};
const myPackage = async (ctx) => (await packagesAs(ctx)).find((p) => (p.recipient_name || '').startsWith(TAG));

test.describe.configure({ mode: 'serial' });

test('1. crear un paquete por chat: la tarjeta NO crea nada hasta confirmar; cancelar no cambia nada', async ({ browser }) => {
  const ctx = await browser.newContext({ locale: 'es-BO' });
  const page = await ctx.newPage();
  await login(page, 'admin');
  await enableAiMode(page);

  const body = await ask(page, `Crea un paquete de La Paz a Oruro de 3 kg para el destinatario "${TAG} Destinatario" con la descripción ${TAG}`);
  const action = proposalOf(body);
  expect(action, `el asistente debía proponer crear el paquete. Respuesta: ${body.response}`).toBeTruthy();
  expect(action.type).toBe('create_package');
  expect(action.lines.join(' ')).toContain('La Paz → Oruro');

  await expect(page.getByText('Registrar un paquete nuevo', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^confirmar$/i })).toBeVisible();
  expect(await myPackage(ctx), 'mientras no se confirma, no se crea nada').toBeUndefined();
  await page.screenshot({ path: 'e2e-results/shots/acc_1_propuesta.png', fullPage: true });

  // cancelar: tampoco crea nada
  await page.getByRole('button', { name: /^cancelar$/i }).click();
  await expect(page.getByText(/no se hizo ningún cambio/i)).toBeVisible();
  expect(await myPackage(ctx)).toBeUndefined();
  await ctx.close();
});

test('2. crear el paquete confirmando; otro usuario no puede confirmar la propuesta y no se puede repetir', async ({ browser }) => {
  const adminCtx = await browser.newContext({ locale: 'es-BO' });
  const page = await adminCtx.newPage();
  await login(page, 'admin');
  await enableAiMode(page);

  const body = await ask(page, `Crea un paquete de La Paz a Oruro de 3 kg para el destinatario "${TAG} Destinatario" con la descripción ${TAG}`);
  const action = proposalOf(body);
  expect(action).toBeTruthy();

  // otro usuario (aunque tenga sesión válida) no puede confirmar una propuesta que no es suya
  const operatorCtx = await browser.newContext({ locale: 'es-BO' });
  const operatorPage = await operatorCtx.newPage();
  await login(operatorPage, 'operator');
  const stolen = await operatorCtx.request.post(`${API}/ai-agent/actions/${action.id}/confirm`, { headers: H });
  expect(stolen.status(), 'un tercero no debe poder confirmar').toBe(404);
  expect(await myPackage(adminCtx), 'el intento ajeno no crea nada').toBeUndefined();
  await operatorCtx.close();

  // el dueño sí, desde la tarjeta
  await page.getByRole('button', { name: /^confirmar$/i }).click();
  await expect(page.getByText(/paquete creado con el código TRK-/i)).toBeVisible({ timeout: 30_000 });
  // recibo: el estado leído de la base tras crear, con enlace a la ficha del paquete
  await expect(page.getByText(/comprobado en el sistema/i)).toBeVisible();
  await expect(page.getByRole('link', { name: /ver paquete trk-/i })).toHaveAttribute('href', /\/logistics\/packages\/[0-9a-f-]{36}/);
  const pkg = await myPackage(adminCtx);
  expect(pkg, 'tras confirmar, el paquete existe').toBeTruthy();
  expect(pkg.status).toBe('pendiente');
  created.packageIds.push(pkg.id);
  state.code = pkg.tracking_code;
  save();
  await page.screenshot({ path: 'e2e-results/shots/acc_2_creado.png', fullPage: true });

  // repetir la confirmación (misma propuesta) se rechaza: no se crea un segundo paquete
  const replay = await adminCtx.request.post(`${API}/ai-agent/actions/${action.id}/confirm`, { headers: H });
  expect(replay.status()).toBe(409);
  expect((await packagesAs(adminCtx)).filter((p) => (p.recipient_name || '').startsWith(TAG))).toHaveLength(1);
  await adminCtx.close();
});

test('3. registrar el evento "En agencia" por chat: cambia el estado solo al confirmar', async ({ browser }) => {
  test.skip(!state.code, 'depende del paso 2');
  const ctx = await browser.newContext({ locale: 'es-BO' });
  const page = await ctx.newPage();
  await login(page, 'admin');
  await enableAiMode(page);

  const body = await ask(page, `Registra que el paquete ${state.code} llegó a la agencia, con la nota "Llegó a agencia ${TAG}"`);
  const action = proposalOf(body);
  expect(action, `debía proponer el evento. Respuesta: ${body.response}`).toBeTruthy();
  expect(action.type).toBe('register_tracking_event');
  expect(action.lines.join(' ')).toContain('En agencia');
  expect((await myPackage(ctx)).status, 'sin confirmar no cambia').toBe('pendiente');

  await page.getByRole('button', { name: /^confirmar$/i }).click();
  await expect(page.getByText(/evento "en agencia" registrado/i)).toBeVisible({ timeout: 30_000 });
  expect((await myPackage(ctx)).status).toBe('en_agencia');
  await ctx.close();
});

test('4. entregar el paquete por chat con una nota; después ya no admite nuevos estados', async ({ browser }) => {
  test.skip(!state.code, 'depende del paso 2');
  const ctx = await browser.newContext({ locale: 'es-BO' });
  const page = await ctx.newPage();
  await login(page, 'admin');
  await enableAiMode(page);

  const body = await ask(page, `Entrega el paquete ${state.code}, recibió la señora Mamani`);
  const action = proposalOf(body);
  expect(action, `debía proponer la entrega. Respuesta: ${body.response}`).toBeTruthy();
  expect(action.type).toBe('deliver_package');
  expect((await myPackage(ctx)).status, 'sin confirmar sigue en agencia').toBe('en_agencia');

  await page.getByRole('button', { name: /^confirmar$/i }).click();
  await expect(page.getByText(/marcado como entregado/i)).toBeVisible({ timeout: 30_000 });
  const pkg = await myPackage(ctx);
  expect(pkg.status).toBe('entregado');
  expect(pkg.delivered_at).toBeTruthy();

  // un paquete entregado ya no admite acciones: el asistente no puede proponer un evento
  const after = await ask(page, `Registra que el paquete ${state.code} llegó a la agencia`);
  expect(proposalOf(after), 'no debe proponer sobre un paquete entregado').toBeUndefined();
  expect((await myPackage(ctx)).status).toBe('entregado');
  await ctx.close();
});

test('5. un cliente no puede pedir acciones: el asistente no le propone nada y nada cambia', async ({ browser }) => {
  test.skip(!state.code, 'depende del paso 2');
  const ctx = await browser.newContext({ locale: 'es-BO' });
  const page = await ctx.newPage();
  await login(page, 'client');
  await enableAiMode(page);

  const body = await ask(page, `Crea un paquete de La Paz a Oruro de 2 kg para "${TAG} Cliente" y entrega el paquete ${state.code}`);
  expect(proposalOf(body), 'un cliente no recibe propuestas').toBeUndefined();
  await expect(page.getByRole('button', { name: /^confirmar$/i })).toHaveCount(0);

  // ni siquiera llamando al endpoint directamente con un id inventado
  const forged = await ctx.request.post(`${API}/ai-agent/actions/11111111-1111-4111-8111-111111111111/confirm`, { headers: H });
  expect(forged.status()).toBe(404);
  const adminCtx = await browser.newContext({ locale: 'es-BO' });
  const adminPage = await adminCtx.newPage();
  await login(adminPage, 'admin');
  expect((await packagesAs(adminCtx)).filter((p) => (p.recipient_name || '').startsWith(TAG))).toHaveLength(1); // sigue siendo uno solo
  await adminCtx.close();
  await ctx.close();
});

test('6. un conductor solo puede proponer entregas de SUS paquetes', async ({ browser }) => {
  test.skip(!state.code, 'depende del paso 2');
  const ctx = await browser.newContext({ locale: 'es-BO' });
  const page = await ctx.newPage();
  await login(page, 'driver');
  await enableAiMode(page);
  // el paquete de prueba no está en ninguna ruta del conductor (y además ya está entregado)
  const body = await ask(page, `Entrega el paquete ${state.code}`);
  expect(proposalOf(body)).toBeUndefined();
  await ctx.close();
});
