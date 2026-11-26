import { test, expect } from '@playwright/test';
import { login, openScreen, closeLeakedContexts } from './helpers.js';

// cierra los contextos de navegador de cada prueba (si no, se acumulan páginas vivas y el archivo se vuelve lento)
test.afterEach(closeLeakedContexts);

/**
 * Conciencia de pantalla con el backend, Supabase y el modelo REALES: estando en el detalle de un paquete, «este paquete» se
 * entiende sin dar el código; en el mapa de un viaje, «este viaje»; en una lista no hay «este». Lo que se ve en pantalla es una
 * pista: un cliente no obtiene datos de un paquete ajeno aunque lo tenga en pantalla (las herramientas siguen aplicando permisos).
 * No crea ni cambia datos.
 */
const API = process.env.E2E_API_URL || 'http://localhost:3000/api';
const H = { 'X-Requested-With': 'XMLHttpRequest' };

const ask = async (page, text) => {
  await page.getByRole('button', { name: /abrir asistente/i }).click();
  const box = page.getByRole('textbox', { name: /mensaje para el asistente/i });
  await box.fill(text);
  await box.press('Enter');
  const last = page.locator('[data-role="assistant"], [data-testid="assistant-message"]').last();
  return last;
};

test('en el detalle de un paquete, «¿dónde está este paquete?» se entiende sin dar el código', async ({ browser }) => {
  test.setTimeout(240000);
  const ctx = await browser.newContext({ locale: 'es-BO', viewport: { width: 1366, height: 800 } });
  const page = await ctx.newPage();
  await login(page, 'admin');
  const b = await (await ctx.request.get(`${API}/logistics/packages`, { headers: H })).json();
  const list = Array.isArray(b) ? b : b.data;
  const demo = list.find((p) => /^DEMO-LOGI/.test(p.description || '') && p.recipient_name === 'Rosa Quispe');
  test.skip(!demo, 'faltan los datos de demostración');

  // lo que viaja en la consulta: la ruta y el paquete en pantalla
  const sent = [];
  page.on('request', (r) => { if (/ai-agent\/chat/.test(r.url()) && r.method() === 'POST') { try { sent.push(JSON.parse(r.postData())); } catch { /* sin cuerpo */ } } });

  await page.goto(`/logistics/packages/${demo.id}`);
  await expect(page.getByRole('heading', { name: demo.tracking_code }).first()).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: /abrir asistente/i }).click();

  // la primera sugerencia habla de «este paquete»
  await expect(page.getByRole('button', { name: '¿Dónde está este paquete?' })).toBeVisible();
  await page.screenshot({ path: 'e2e-results/pantalla-1-sugerencias.png' });
  await page.getByRole('button', { name: '¿Dónde está este paquete?' }).click();

  await expect.poll(() => sent.length, { timeout: 30000 }).toBeGreaterThan(0);
  expect(sent[0].context).toEqual({ path: `/logistics/packages/${demo.id}`, entity: { type: 'package', ref: demo.tracking_code } });

  // el asistente responde sobre ESE paquete, sin que nadie le haya dicho el código
  // (dentro del chat: el título de la página también lleva el código y no cuenta como respuesta)
  const panel = page.locator('#ai-assistant-panel');
  await expect(panel.getByText(/pendiente|en tránsito|asignado|ubicaci[oó]n|La Paz/i).last()).toBeVisible({ timeout: 120000 });
  await expect(panel.getByText(new RegExp(demo.tracking_code.slice(-8), 'i')).first()).toBeVisible({ timeout: 120000 });
  await expect(panel.getByText(/pensando respuesta/i)).toHaveCount(0, { timeout: 120000 });
  await page.screenshot({ path: 'e2e-results/pantalla-2-respuesta.png' });
});

test('fuera de un paquete no se envía ningún elemento en pantalla', async ({ browser }) => {
  const ctx = await browser.newContext({ locale: 'es-BO', viewport: { width: 1366, height: 800 } });
  const page = await ctx.newPage();
  await login(page, 'admin');
  const sent = [];
  page.on('request', (r) => { if (/ai-agent\/chat/.test(r.url()) && r.method() === 'POST') { try { sent.push(JSON.parse(r.postData())); } catch { /* sin cuerpo */ } } });
  await page.goto('/logistics/packages');
  await page.getByRole('button', { name: /abrir asistente/i }).click();
  await expect(page.getByRole('button', { name: '¿Dónde está este paquete?' })).toHaveCount(0);
  const box = page.getByRole('textbox', { name: /mensaje para el asistente/i });
  await box.fill('hola');
  await box.press('Enter');
  await expect.poll(() => sent.length, { timeout: 30000 }).toBeGreaterThan(0);
  expect(sent[0].context.entity).toBeUndefined(); // ningún paquete abierto: solo la ruta y la pestaña
  expect(sent[0].context).toEqual({ path: '/logistics/packages', view: { tab: 'all' } });
});

/** Envía «hola» al asistente y devuelve el contexto que viajó con la consulta. */
const contextSent = async (page, sent) => {
  const before = sent.length;
  await page.getByRole('button', { name: /abrir asistente/i }).click();
  const box = page.getByRole('textbox', { name: /mensaje para el asistente/i });
  await box.fill('hola');
  await box.press('Enter');
  await expect.poll(() => sent.length, { timeout: 30000 }).toBeGreaterThan(before);
  return sent[before].context;
};
const watch = (page) => {
  const sent = [];
  page.on('request', (r) => { if (/ai-agent\/chat/.test(r.url()) && r.method() === 'POST') { try { sent.push(JSON.parse(r.postData())); } catch { /* sin cuerpo */ } } });
  return sent;
};

test('lista de paquetes: manda la pestaña abierta y, al abrir una ficha, ese paquete', async ({ browser }) => {
  test.setTimeout(240000);
  const ctx = await browser.newContext({ locale: 'es-BO', viewport: { width: 1366, height: 800 } });
  const page = await ctx.newPage();
  await login(page, 'admin');
  const sent = watch(page);
  await openScreen(page, '/logistics/packages', (pg) => pg.getByRole('heading', { name: /panel de despachos/i }).first());
  expect((await contextSent(page, sent))).toEqual({ path: '/logistics/packages', view: { tab: 'all' } });

  await page.keyboard.press('Escape'); // el panel del chat tapa los botones de la derecha
  await expect(page.locator('#ai-assistant-panel')).toHaveCount(0);
  await page.getByRole('button', { name: 'Histórico' }).click();
  await expect(page.getByRole('heading', { name: /historial de despachos/i }).first()).toBeVisible();
  await page.getByRole('button', { name: /abrir asistente/i }).click();
  const box = page.getByRole('textbox', { name: /mensaje para el asistente/i });
  await box.fill('hola otra vez'); await box.press('Enter');
  await expect.poll(() => sent.length, { timeout: 30000 }).toBe(2);
  expect(sent[1].context).toEqual({ path: '/logistics/packages', view: { tab: 'delivered' } });
});

test('Tracking: manda el paquete cuyo seguimiento se muestra', async ({ browser }) => {
  test.setTimeout(240000);
  const ctx = await browser.newContext({ locale: 'es-BO', viewport: { width: 1366, height: 800 } });
  const page = await ctx.newPage();
  await login(page, 'admin');
  const sent = watch(page);
  await openScreen(page, '/tracking', (pg) => pg.getByText(/TRK-/).first()); // ya cargó y seleccionó el primer paquete
  const context = await contextSent(page, sent);
  expect(context.path).toBe('/tracking');
  expect(context.entity).toMatchObject({ type: 'package' });
  expect(context.entity.ref).toMatch(/^TRK-/);
});

test('flota: manda la pestaña (vehículos o conductores)', async ({ browser }) => {
  test.setTimeout(240000);
  const ctx = await browser.newContext({ locale: 'es-BO', viewport: { width: 1366, height: 800 } });
  const page = await ctx.newPage();
  await login(page, 'admin');
  const sent = watch(page);
  await openScreen(page, '/fleet', (pg) => pg.getByRole('button', { name: /conductores/i }).first());
  expect((await contextSent(page, sent)).view).toEqual({ tab: 'vehicles' });
  await page.keyboard.press('Escape');
  await expect(page.locator('#ai-assistant-panel')).toHaveCount(0);
  await page.getByRole('button', { name: /^conductores/i }).first().click();
  await page.getByRole('button', { name: /abrir asistente/i }).click();
  const box = page.getByRole('textbox', { name: /mensaje para el asistente/i });
  await box.fill('hola otra vez'); await box.press('Enter');
  await expect.poll(() => sent.length, { timeout: 30000 }).toBe(2);
  expect(sent[1].context).toEqual({ path: '/fleet', view: { tab: 'drivers' } });
});

test('SEGURIDAD: el contexto es una pista; un cliente con el código de un paquete AJENO en pantalla no obtiene sus datos', async ({ browser }) => {
  test.setTimeout(240000);
  const admin = await browser.newContext(); await login(await admin.newPage(), 'admin');
  const client = await browser.newContext(); await login(await client.newPage(), 'client');
  const list = async (ctx) => { const b = await (await ctx.request.get(`${API}/logistics/packages`, { headers: H })).json(); return Array.isArray(b) ? b : b.data; };
  const mine = new Set((await list(client)).map((p) => p.id));
  // un paquete que existe pero NO es de este cliente
  const foreign = (await list(admin)).find((p) => !mine.has(p.id));
  test.skip(!foreign, 'no hay un paquete ajeno para comprobarlo');

  // el cliente envía a mano un contexto que apunta a ese paquete: no debe ver nada de él
  const r = await client.request.post(`${API}/ai-agent/chat`, { headers: H, data: { message: '¿Dónde está este paquete? ¿Quién lo recibe?', context: { path: `/logistics/packages/${foreign.id}`, entity: { type: 'package', ref: foreign.tracking_code } } } });
  expect(r.status()).toBe(200);
  const text = String((await r.json()).response);
  console.log('[cliente] ' + text.replace(/\s+/g, ' ').slice(0, 300));
  if (foreign.recipient_name) expect(text.toLowerCase()).not.toContain(String(foreign.recipient_name).toLowerCase());
  expect(text).not.toContain(foreign.tracking_code.slice(-8)); // ni siquiera repite el código como si lo hubiera encontrado
});
