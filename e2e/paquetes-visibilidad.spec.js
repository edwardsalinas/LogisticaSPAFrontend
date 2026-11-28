import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { login, closeLeakedContexts } from './helpers.js';

test.afterEach(closeLeakedContexts);

/**
 * Un paquete recién creado se puede ENCONTRAR: en el tablero se ve con su código (no con un fragmento del identificador), la pantalla de Paquetes
 * lo encuentra en la vista «Todos» sea cual sea su viaje o su fecha, y su ficha muestra SUS datos (nunca un paquete de ejemplo).
 * Crea 3 paquetes con la marca E2E-<sello> (ids en e2e-results/created-visibilidad.json, ver e2e-cleanup): uno sin viaje, uno con un viaje de
 * hoy y uno con un viaje de otro día. Si no hay viajes planeados para eso, esos casos se omiten.
 */
const TAG = `E2E-${Date.now()}`;
const created = { tag: TAG, routeIds: [], packageIds: [] };
const API = process.env.E2E_API_URL || 'http://localhost:3000/api';
const H = { 'X-Requested-With': 'XMLHttpRequest' };
const save = () => writeFileSync('e2e-results/created-visibilidad.json', JSON.stringify(created, null, 2));
const ymd = (d) => new Date(d.getTime() - 4 * 3600e3).toISOString().slice(0, 10); // día en Bolivia

test.describe.configure({ mode: 'serial' });

let pkgs; // { A, B, C } con { id, code }

test('preparación: se crean un paquete sin viaje, uno con el viaje de hoy y uno con un viaje de otro día', async ({ browser }) => {
  const ctx = await browser.newContext({ locale: 'es-BO' });
  const page = await ctx.newPage();
  await login(page, 'operator');
  const routesRes = await ctx.request.get(`${API}/logistics/routes`, { headers: H });
  const routes = ((await routesRes.json()).data ?? []).filter((r) => r.type !== 'schedule' && r.status === 'planeada' && r.origin && r.destination && Date.parse(r.departure_time) > Date.now() + 3600e3);
  const today = ymd(new Date());
  const todayRoute = routes.find((r) => ymd(new Date(r.departure_time)) === today);
  const otherRoute = routes.find((r) => ymd(new Date(r.departure_time)) !== today);

  const make = async (name, extra = {}) => {
    const res = await ctx.request.post(`${API}/logistics/packages`, {
      headers: H,
      data: { origen: 'La Paz', destino: 'Oruro', peso: 1, recipient_name: `${TAG} ${name}`, description: TAG, sender_name: 'Prueba', is_guest: true, ...extra },
    });
    expect(res.status(), await res.text()).toBe(201);
    const body = await res.json();
    const pkg = body.data ?? body;
    created.packageIds.push(pkg.id); save();
    return { id: pkg.id, code: pkg.tracking_code, status: pkg.status };
  };
  pkgs = { A: await make('A sin viaje') };
  if (todayRoute) pkgs.B = await make('B viaje de hoy', { route_id: todayRoute.id });
  if (otherRoute) pkgs.C = await make('C viaje de otro dia', { route_id: otherRoute.id });
  expect(pkgs.A.status).toBe('pendiente');
});

test('el tablero muestra el código del paquete con un enlace a su ficha, nunca un fragmento del identificador interno', async ({ browser }) => {
  const ctx = await browser.newContext({ locale: 'es-BO', viewport: { width: 1366, height: 800 } });
  const page = await ctx.newPage();
  await login(page, 'operator');
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  const section = page.locator('article', { has: page.getByRole('heading', { name: /despachos prioritarios/i }) });
  await expect(section).toBeVisible({ timeout: 30_000 });
  const links = section.locator('tbody a[href^="/logistics/packages/"]');
  await expect(links.first()).toBeVisible({ timeout: 30_000 });
  const rows = await links.evaluateAll((els) => els.map((e) => ({ text: e.textContent.trim(), href: e.getAttribute('href') })));
  expect(rows.length).toBeGreaterThan(0);
  for (const r of rows) {
    expect(r.text, 'cada fila muestra el código del paquete').toMatch(/^TRK-/);
    expect(r.href).toMatch(/^\/logistics\/packages\/[0-9a-f-]{36}$/);
  }
  const text = await section.innerText();
  expect(text).not.toMatch(/Unidad Logística|Operador asignado/); // ya no se inventa un operador
  expect(text).not.toMatch(/(?<![-\w])[0-9A-F]{8}(?![-\w])/); // ni un fragmento suelto del UUID (el sufijo del código TRK-…-XXXXXXXX sí es legítimo)
});

test('Paquetes: el paquete sin viaje está en Carga suelta; en «Todos» se encuentran los tres, también el de otro día', async ({ browser }) => {
  const ctx = await browser.newContext({ locale: 'es-BO', viewport: { width: 1366, height: 800 } });
  const page = await ctx.newPage();
  await login(page, 'operator');
  await page.addInitScript(() => sessionStorage.clear());
  await page.goto('/logistics/packages', { waitUntil: 'domcontentloaded' });
  // la vista inicial no arrastra ninguna búsqueda
  await expect(page.getByLabel('Buscar viaje o ruta')).toHaveValue('', { timeout: 30_000 });
  await expect(page.getByTestId('filtro-activo')).toHaveCount(0);

  await page.getByRole('button', { name: /^todos$/i }).click();
  const table = page.getByRole('table', { name: /todos los paquetes/i });
  await expect(table).toBeVisible({ timeout: 30_000 });
  for (const key of Object.keys(pkgs)) {
    await page.getByLabel('Buscar viaje o ruta').fill(pkgs[key].code);
    await expect(page.getByTestId('filtro-activo')).toContainText(pkgs[key].code);
    await expect(table.getByRole('link', { name: pkgs[key].code }), `el paquete ${key} se encuentra en «Todos»`).toBeVisible({ timeout: 20_000 });
  }

  // quitar el filtro devuelve la lista completa
  await page.getByRole('button', { name: /quitar filtro/i }).click();
  await expect(page.getByLabel('Buscar viaje o ruta')).toHaveValue('');
  await expect(page.getByTestId('filtro-activo')).toHaveCount(0);

  // un paquete de otro día buscado desde el tablero avisa que está fuera de la vista y lleva a «Todos»
  if (pkgs.C) {
    await page.getByRole('button', { name: /^operativos$/i }).click();
    await page.getByLabel('Buscar viaje o ruta').fill(pkgs.C.code);
    const notice = page.getByTestId('filtro-activo');
    await expect(notice).toContainText(/fuera de esta vista/, { timeout: 20_000 });
    await notice.getByRole('button', { name: /ver en «todos»/i }).click();
    await expect(page.getByRole('table', { name: /todos los paquetes/i }).getByRole('link', { name: pkgs.C.code })).toBeVisible({ timeout: 20_000 });
  }
});

test('la búsqueda no se arrastra: al salir y volver a Paquetes la lista está limpia', async ({ browser }) => {
  const ctx = await browser.newContext({ locale: 'es-BO', viewport: { width: 1366, height: 800 } });
  const page = await ctx.newPage();
  await login(page, 'operator');
  await page.goto('/logistics/packages', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Buscar viaje o ruta').fill(pkgs.A.code);
  await expect(page.getByTestId('filtro-activo')).toBeVisible();
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await page.goto('/logistics/packages', { waitUntil: 'domcontentloaded' });
  await expect(page.getByLabel('Buscar viaje o ruta')).toHaveValue('', { timeout: 30_000 });
  await expect(page.getByTestId('filtro-activo')).toHaveCount(0);
});

test('la ficha muestra los datos REALES del paquete (incluso uno fuera de los 50 más recientes) y no un paquete de ejemplo', async ({ browser }) => {
  const ctx = await browser.newContext({ locale: 'es-BO', viewport: { width: 1366, height: 800 } });
  const page = await ctx.newPage();
  await login(page, 'operator');
  for (const key of Object.keys(pkgs)) {
    await page.goto(`/logistics/packages/${pkgs[key].id}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: pkgs[key].code }), `ficha de ${key}`).toBeVisible({ timeout: 30_000 });
    const text = await page.locator('main').innerText();
    expect(text).not.toMatch(/SPA-7749202394|Comercializadora El Alto|60x40x40|19 Mar/);
    expect(text).not.toMatch(/65\s?%/);
    expect(text).toContain(`${TAG} ${key === 'A' ? 'A sin viaje' : key === 'B' ? 'B viaje de hoy' : 'C viaje de otro dia'}`);
  }
  // un paquete que no existe dice que no se encontró (antes mostraba uno de ejemplo)
  await page.goto('/logistics/packages/00000000-0000-4000-8000-000000000000', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /no encontramos el paquete/i })).toBeVisible({ timeout: 30_000 });
  expect(await page.locator('main').innerText()).not.toMatch(/SPA-7749202394/);
});
