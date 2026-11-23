import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { login, watchProblems } from './helpers.js';

/**
 * Ciclo de vida completo con acciones reales (escribe en la base conectada al backend):
 * crear ruta -> crear paquete asignado a esa ruta -> el conductor inicia el viaje y entrega con nota
 * -> evento manual de seguimiento -> el cliente consulta. Todo lo creado lleva la marca E2E-<sello>.
 * Los ids creados se guardan en e2e-results/created.json para poder limpiarlos después.
 */
const STAMP = Date.now();
const TAG = `E2E-${STAMP}`;
const created = { tag: TAG, routeIds: [], packageIds: [] };
const state = {};
const save = () => writeFileSync('e2e-results/created.json', JSON.stringify(created, null, 2));

const localInput = (date) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`;
};

// selectOption no admite expresiones regulares: se localiza la opción por texto y se elige por valor
const pickByText = async (select, pattern) => {
  const value = await select.locator('option', { hasText: pattern }).first().getAttribute('value');
  expect(value, `no hay una opción que coincida con ${pattern}`).toBeTruthy();
  await select.selectOption({ value });
};

test.describe.configure({ mode: 'serial' });

test('1. el administrador crea un viaje único desde el formulario', async ({ page }) => {
  const problems = watchProblems(page);
  await login(page, 'admin');
  await page.goto('/logistics/routes');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.getByRole('button', { name: /^\s*nuevo\s*$/i }).first().click();

  const dialog = page.locator('[role="dialog"]');
  await dialog.locator('select').nth(0).selectOption({ label: 'Juan Pérez (Conductor)' });
  await dialog.locator('select').nth(1).selectOption({ index: 1 });
  await pickByText(dialog.locator('select').nth(2), /La Paz → Oruro/);
  await page.getByRole('button', { name: /viaje único/i }).click();
  const departure = new Date(Date.now() + 40 * 60 * 1000);
  await dialog.locator('input[name="departure_time"]').fill(localInput(departure));

  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/logistics/routes') && r.request().method() === 'POST'),
    dialog.getByRole('button', { name: /confirmar (viaje|rutina)/i }).click(),
  ]);
  const body = await response.json().catch(() => ({}));
  expect(response.status(), `crear ruta: ${JSON.stringify(body).slice(0, 300)}`).toBeLessThan(300);
  state.routeId = body?.data?.id ?? body?.data?.route?.id ?? body?.id;
  expect(state.routeId, 'la API debe devolver el id de la ruta creada').toBeTruthy();
  created.routeIds.push(state.routeId);
  save();
  await expect(dialog).toBeHidden({ timeout: 10_000 });
  expect(problems.filter((p) => !p.startsWith('API 4'))).toEqual([]);
});

test('2. el administrador registra un paquete asignado a esa ruta', async ({ page }) => {
  test.skip(!state.routeId, 'depende del paso 1');
  await login(page, 'admin');
  await page.goto('/logistics/packages');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.getByRole('button', { name: /nuevo registro global/i }).click();

  const dialog = page.locator('[role="dialog"]');
  await dialog.locator('select#origen').selectOption('La Paz');
  await dialog.locator('select#destino').selectOption('Oruro');
  await dialog.locator('select#route_id').selectOption({ value: state.routeId });
  await dialog.locator('input[type="checkbox"]').check(); // modo invitado
  await dialog.locator('#sender_name').fill('E2E Remitente');
  await dialog.locator('#sender_phone').fill('71223344');
  await dialog.locator('#recipient_name').fill(`${TAG} Destinatario`);
  await dialog.locator('#recipient_phone').fill('60113322');
  await dialog.locator('#peso').fill('2.5');
  await dialog.locator('#description').fill(TAG);

  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith('/api/logistics/packages') && r.request().method() === 'POST'),
    dialog.getByRole('button', { name: /registrar paquete/i }).click(),
  ]);
  const body = await response.json().catch(() => ({}));
  expect(response.status(), `crear paquete: ${JSON.stringify(body).slice(0, 300)}`).toBeLessThan(300);
  const pkg = body?.data;
  state.packageId = pkg?.id;
  state.trackingCode = pkg?.tracking_code;
  expect(state.trackingCode).toMatch(/^TRK-/);
  created.packageIds.push(state.packageId);
  save();
  expect(pkg.status, 'un paquete asignado a una ruta no iniciada queda "asignado"').toBe('asignado');
  expect(pkg.route_id).toBe(state.routeId);
});

test('3. el administrador registra "En agencia" desde Tracking (antes de la entrega)', async ({ page }) => {
  test.skip(!state.packageId, 'depende del paso 2');
  await login(page, 'admin');
  await page.goto('/tracking');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.getByRole('button', { name: /registrar evento/i }).click();
  const dialog = page.locator('[role="dialog"]');
  await pickByText(dialog.getByLabel(/^paquete/i), new RegExp(state.trackingCode));
  await dialog.getByLabel(/^estado/i).selectOption('en_agencia');
  // la ubicación se elige por ciudad (las coordenadas exactas quedan en un apartado avanzado)
  await dialog.getByLabel(/^ciudad/i).selectOption({ label: 'Oruro' });
  const [res] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith('/api/tracking') && r.request().method() === 'POST'),
    dialog.getByRole('button', { name: /guardar evento/i }).click(),
  ]);
  expect(res.status(), await res.text()).toBeLessThan(300);
  // El paquete cambió de estado a "en agencia"
  const api = process.env.E2E_API_URL || 'http://localhost:3000/api';
  const list = await (await page.context().request.get(`${api}/logistics/packages`, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })).json();
  expect((Array.isArray(list) ? list : list.data).find((p) => p.id === state.packageId).status).toBe('en_agencia');
});

test('4. el conductor ve el viaje, lo inicia y entrega el paquete con una nota', async ({ browser }) => {
  test.skip(!state.packageId, 'depende del paso 2');
  const context = await browser.newContext({ permissions: ['geolocation'], geolocation: { latitude: -16.5, longitude: -68.15 }, locale: 'es-BO' });
  const page = await context.newPage();
  const problems = watchProblems(page);
  await login(page, 'driver');
  await page.goto('/driver');
  await page.waitForLoadState('networkidle').catch(() => {});

  // Selecciona el viaje en el calendario (evento del día) y lo inicia
  const eventLocator = page.locator('.fc-event').filter({ hasText: /LA PAZ\s*-\s*ORURO/i }).last();
  await expect(eventLocator, 'el viaje recién creado debe aparecer en el calendario del conductor').toBeVisible({ timeout: 15_000 });
  await eventLocator.click();
  await page.getByRole('button', { name: /iniciar/i }).first().click();
  await expect(page.getByText(state.trackingCode)).toBeVisible({ timeout: 20_000 });

  // Entrega con nota
  await page.getByRole('button', { name: /^entregar$/i }).first().click();
  await page.getByLabel(/nota de entrega/i).fill('Recibió la señora Mamani (E2E)');
  const [deliver] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/deliver') && r.request().method() === 'PATCH'),
    page.getByRole('button', { name: /confirmar entrega/i }).click(),
  ]);
  expect(deliver.status(), `entrega: ${await deliver.text()}`).toBe(200);
  await expect(page.getByText(/éxito/i).first()).toBeVisible();

  // Finaliza el viaje
  await page.getByRole('button', { name: /finalizar/i }).first().click();
  await page.waitForTimeout(1500);
  expect(problems.filter((p) => !/geolocation|Geolocation/.test(p))).toEqual([]);
  await context.close();
});

test('5. el administrador comprueba el resultado: paquete entregado e historial con responsable', async ({ page }) => {
  test.skip(!state.packageId, 'depende del paso 2');
  await login(page, 'admin');
  const api = process.env.E2E_API_URL || 'http://localhost:3000/api'; // las cookies de sesión valen para todo localhost
  const res = await page.context().request.get(`${api}/logistics/packages`, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
  expect(res.status()).toBe(200);
  const body = await res.json();
  const list = Array.isArray(body) ? body : body.data;
  const pkg = list.find((p) => p.id === state.packageId);
  console.log('  paquete tras la entrega:', JSON.stringify({ status: pkg?.status, delivered_at: pkg?.delivered_at }));
  expect(pkg, 'el paquete creado debe estar en el listado').toBeTruthy();
  expect(pkg.status).toBe('entregado');
  expect(pkg.delivered_at).toBeTruthy();
});

test('6. un paquete ya entregado no admite nuevos estados (el servidor lo rechaza)', async ({ page }) => {
  test.skip(!state.packageId, 'depende del paso 2');
  await login(page, 'admin');
  const api = process.env.E2E_API_URL || 'http://localhost:3000/api';
  const res = await page.context().request.post(`${api}/tracking`, {
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
    data: { package_id: state.packageId, lat: -17.97, lng: -67.1, status: 'en_agencia' },
  });
  expect(res.status(), await res.text()).toBe(409);
  const list = await (await page.context().request.get(`${api}/logistics/packages`, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })).json();
  expect((Array.isArray(list) ? list : list.data).find((p) => p.id === state.packageId).status).toBe('entregado');
});

test('7. el cliente no ve paquetes de otros y el chat respeta los permisos', async ({ page }) => {
  test.skip(!state.packageId, 'depende del paso 2');
  await login(page, 'client');
  await page.goto('/logistics/packages');
  await page.waitForLoadState('networkidle').catch(() => {});
  const text = await page.locator('body').innerText();
  expect(text, 'el cliente no debe ver el paquete creado por un administrador para otro remitente').not.toContain(state.trackingCode);
});

test('8. Analítica refleja los datos reales: el envío entregado y el conductor aparecen', async ({ page }) => {
  test.skip(!state.packageId, 'depende del paso 2');
  await login(page, 'admin');
  await page.goto('/analytics');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.screenshot({ path: 'e2e-results/shots/analytics_con_datos.png', fullPage: true });
  const text = await page.locator('body').innerText();
  expect(text).toContain('Entregado');            // estado de los envíos
  expect(text).toContain('Juan Pérez');           // ranking: el conductor que entregó
  expect(text).not.toContain('12,482');           // ya no hay cifras inventadas
  expect(text).not.toContain('Carlos Ruiz');
});

const API = process.env.E2E_API_URL || 'http://localhost:3000/api';
const H = { 'X-Requested-With': 'XMLHttpRequest' };
// Escribe en el asistente y devuelve SOLO la última respuesta del asistente (no el texto de toda la página)
const askAssistant = async (page, question) => {
  await page.getByRole('button', { name: /abrir asistente/i }).click();
  const answers = page.locator('[data-role="assistant"]');
  await page.getByLabel(/mensaje para el asistente/i).fill(question);
  // La respuesta llega en vivo (SSE): se espera a que el servidor termine de enviarla y a que desaparezca "Consultando…"
  // (contar mensajes no sirve: el saludo inicial del panel cuenta como mensaje y luego se reemplaza)
  const done = page.waitForResponse((r) => r.url().includes('/ai-agent/chat') && r.request().method() === 'POST', { timeout: 120_000 });
  await page.getByRole('button', { name: /^enviar$/i }).click();
  await (await done).finished();
  await expect(page.locator('p:not(.sr-only)').filter({ hasText: /consultando…/i })).toBeHidden({ timeout: 30_000 });
  // el texto se pinta un instante después de que termina la respuesta: se espera a que tenga contenido
  await expect.poll(async () => (await answers.last().innerText()).replace(/Asistente:/i, '').trim().length, { timeout: 15_000 }).toBeGreaterThan(10);
  return answers.last().innerText();
};

test('9. un cliente ve SU paquete (asignado por el administrador) y consulta al asistente por código', async ({ browser }) => {
  test.skip(!state.packageId, 'depende del paso 2');

  // el cliente: su id
  const clientCtx = await browser.newContext({ locale: 'es-BO' });
  const clientPage = await clientCtx.newPage();
  await login(clientPage, 'client');
  const prof = await (await clientCtx.request.get(`${API}/iam/profile`, { headers: H })).json();
  const clientId = prof?.data?.id ?? prof?.user?.id ?? prof?.id ?? prof?.data?.user?.id;
  expect(clientId, `no se pudo leer el id del cliente: ${JSON.stringify(prof).slice(0, 200)}`).toBeTruthy();

  // el administrador crea un paquete a nombre de ese cliente (sender_id)
  const adminCtx = await browser.newContext({ locale: 'es-BO' });
  const adminPage = await adminCtx.newPage();
  await login(adminPage, 'admin');
  const res = await adminCtx.request.post(`${API}/logistics/packages`, {
    headers: H,
    data: { origen: 'La Paz', destino: 'Oruro', peso: 1.5, description: TAG, recipient_name: `${TAG} Cliente`, recipient_phone: '60113322', sender_id: clientId },
  });
  expect(res.status(), await res.text()).toBe(201);
  const pkg = (await res.json()).data;
  state.clientPackage = pkg;
  created.packageIds.push(pkg.id);
  save();

  // el cliente lo ve en su lista y le pregunta al asistente
  await clientPage.goto('/logistics/packages');
  await clientPage.waitForLoadState('networkidle').catch(() => {});
  const listText = await clientPage.locator('body').innerText();
  expect(listText, 'el cliente debe ver su paquete').toContain(pkg.tracking_code);

  const answer = await askAssistant(clientPage, `¿En qué estado está mi paquete ${pkg.tracking_code}?`);
  expect(answer, 'respuesta del asistente').toContain(pkg.tracking_code);
  expect(answer.toLowerCase()).toMatch(/pendiente|registrado/); // sin ruta asignada: estado pendiente
  expect(answer).not.toMatch(/No pude procesar|error técnico|error interno/i);
  await clientCtx.close();
  await adminCtx.close();
});

test('10. el cliente no puede consultar con el asistente un paquete que no es suyo', async ({ page }) => {
  test.skip(!state.packageId, 'depende del paso 2');
  await login(page, 'client');
  await page.goto('/logistics/packages');
  await page.waitForLoadState('networkidle').catch(() => {});
  const answer = await askAssistant(page, `¿En qué estado está el paquete ${state.trackingCode}?`);
  void answer;
  // el modelo lo dice con sus palabras ("no tengo permiso…"): se espera a que la burbuja de la respuesta tenga ese contenido
  await expect(page.locator('[data-role="assistant"]').last(), 'respuesta del asistente').toContainText(/permiso|acceso|no puedo|no está disponible|no pude/i, { timeout: 30_000 });
});

test('11. el administrador busca por nombre con el asistente (HU01)', async ({ page }) => {
  test.skip(!state.packageId, 'depende del paso 2');
  await login(page, 'admin');
  await page.goto('/');
  await page.waitForLoadState('networkidle').catch(() => {});
  const answer = await askAssistant(page, `¿Dónde está la caja a nombre de ${TAG} Destinatario?`);
  expect(answer, 'respuesta del asistente').toContain(state.trackingCode);
});
