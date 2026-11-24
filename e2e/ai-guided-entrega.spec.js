import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { login } from './helpers.js';

/**
 * «Que Logi lo haga» para ENTREGAR, con el backend, Supabase y Gemini reales. El conductor inicia su viaje, le pide al asistente
 * que entregue el paquete (con una nota) y Logi lo hace en SU pantalla: pulsa «Entregar», escribe la nota y «pulsa» Confirmar
 * entrega. Se comprueba, en la API, que el paquete queda entregado con la nota, y que por voz esta acción nunca se confirma
 * (lo cubren las pruebas unitarias del chat de voz).
 * Los datos creados llevan la marca E2E-<sello> (ids en e2e-results/created-entrega.json, ver e2e-cleanup).
 */
const STAMP = Date.now();
const TAG = `E2E-${STAMP}`;
const created = { tag: TAG, routeIds: [], packageIds: [] };
const API = process.env.E2E_API_URL || 'http://localhost:3000/api';
const H = { 'X-Requested-With': 'XMLHttpRequest' };
const save = () => writeFileSync('e2e-results/created-entrega.json', JSON.stringify(created, null, 2));
const state = {};

test.describe.configure({ mode: 'serial' });

test('0. prepara un viaje con un paquete para el conductor', async ({ browser }) => {
  const ctx = await browser.newContext({ locale: 'es-BO' });
  const page = await ctx.newPage();
  await login(page, 'admin');
  const me = await (await ctx.request.get(`${API}/iam/profile`, { headers: H })).json().catch(() => ({}));
  const drivers = await (await ctx.request.get(`${API}/fleet/drivers`, { headers: H })).json().catch(() => ({}));
  const vehicles = await (await ctx.request.get(`${API}/fleet/vehicles`, { headers: H })).json().catch(() => ({}));
  const driver = (drivers.data ?? []).find((d) => /driver@logistica\.bo/i.test(JSON.stringify(d))) ?? (drivers.data ?? [])[0];
  const vehicle = (vehicles.data ?? []).find((v) => v.plate === 'XYZ-789') ?? (vehicles.data ?? [])[0];
  test.skip(!driver || !vehicle, `no hay conductor o vehículo para la prueba (${Object.keys(me).join(',')})`);

  const route = await ctx.request.post(`${API}/logistics/routes`, {
    headers: H,
    data: {
      driver_id: driver.id, vehicle_id: vehicle.id, origin: 'Oruro', destination: 'La Paz', origin_lat: -17.9647, origin_lng: -67.1061, dest_lat: -16.4897, dest_lng: -68.1193,
      route_code: `${TAG}-RT`, departure_time: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
      checkpoints: [{ name: 'Patacamaya', lat: -17.2333, lng: -67.9167, sequence_order: 1 }],
    },
  });
  expect(route.status(), await route.text()).toBeLessThan(300);
  const r = (await route.json()).data;
  created.routeIds.push(r.id);
  const pkg = await ctx.request.post(`${API}/logistics/packages`, {
    headers: H,
    data: { description: TAG, origen: 'Oruro', destino: 'La Paz', peso: 2, recipient_name: `${TAG} Destinatario`, sender_name: `${TAG} Remitente`, route_id: r.id },
  });
  expect(pkg.status(), await pkg.text()).toBe(201);
  const p = (await pkg.json()).data;
  created.packageIds.push(p.id);
  save();
  state.code = p.tracking_code;
  state.packageId = p.id;
  await ctx.close();
});

test('1. el conductor le pide al asistente entregar el paquete y Logi lo hace en su pantalla', async ({ browser }) => {
  test.skip(!state.code, 'depende del paso 0');
  test.setTimeout(300_000);
  const ctx = await browser.newContext({ permissions: ['geolocation'], geolocation: { latitude: -17.9647, longitude: -67.1061 }, locale: 'es-BO', viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  await login(page, 'driver');
  await page.goto('/driver');
  await page.waitForLoadState('networkidle').catch(() => {});

  // el conductor inicia su viaje (el evento lleva el código del viaje de prueba)
  const mine = page.locator('.fc-event').filter({ hasText: new RegExp(TAG, 'i') }).first();
  if (!(await mine.count())) { await page.locator('.fc-next-button').first().click().catch(() => {}); await page.waitForTimeout(1500); }
  await expect(mine, 'el viaje de prueba debe aparecer en el calendario del conductor').toBeVisible({ timeout: 20_000 });
  await mine.dispatchEvent('click');
  await page.getByRole('button', { name: /iniciar/i }).first().click();
  await expect(page.locator(`[data-logi-entregar="${state.code}"]`)).toBeVisible({ timeout: 30_000 }); // «Carga a entregar»

  // le pide al asistente que lo entregue
  await page.getByRole('button', { name: /abrir asistente/i }).click();
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/ai-agent/chat') && r.request().method() === 'POST', { timeout: 120_000 }),
    (async () => {
      await page.getByLabel(/mensaje para el asistente/i).fill(`Entrega el paquete ${state.code} con la nota Recibió el señor Quispe`);
      await page.getByRole('button', { name: /^enviar$/i }).click();
    })(),
  ]);
  const events = (await response.text()).split(/\r?\n/).filter((l) => l.startsWith('data: ')).map((l) => JSON.parse(l.slice(6)));
  const action = events.find((e) => e.type === 'final')?.attachments?.find((a) => a.kind === 'action_proposal')?.action;
  expect(action, 'el asistente debía proponer la entrega').toBeTruthy();
  expect(action.type).toBe('deliver_package');
  expect(action.ui.fill.form).toBe('delivery'); // el conductor tiene datos para que Logi lo muestre
  expect(action.ui.fill.values.items.map((i) => i.tracking_code)).toEqual([state.code]);

  await page.getByRole('button', { name: /que logi lo haga/i }).click();
  await expect(page.locator('[data-logi-run]')).toHaveCount(1, { timeout: 15_000 });
  await expect(page.locator('[data-logi-active]').first()).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('[data-logi-run]')).toHaveCount(0, { timeout: 120_000 });

  const list = await (await ctx.request.get(`${API}/logistics/packages`, { headers: H })).json();
  const mineNow = (Array.isArray(list) ? list : list.data).find((p) => p.id === state.packageId);
  expect(mineNow.status, 'el paquete debe quedar entregado').toBe('entregado');
  await ctx.close();
});
