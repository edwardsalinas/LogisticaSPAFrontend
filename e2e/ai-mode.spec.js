import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { login } from './helpers.js';

/**
 * Modo IA: la preferencia, la pantalla del asistente y sus respuestas con tarjetas, con el backend, Supabase y
 * Gemini reales. Crea un paquete etiquetado para el cliente (ids en e2e-results/created-ai.json, ver e2e-cleanup).
 */
const STAMP = Date.now();
const TAG = `E2E-${STAMP}`;
const created = { tag: TAG, routeIds: [], packageIds: [] };
const API = process.env.E2E_API_URL || 'http://localhost:3000/api';
const H = { 'X-Requested-With': 'XMLHttpRequest' };
const shot = (page, name) => page.screenshot({ path: `e2e-results/shots/${name}.png`, fullPage: true });

const askAndWait = async (page, question) => {
  await page.getByLabel(/mensaje para el asistente/i).fill(question);
  await page.getByRole('button', { name: /^enviar$/i }).click();
  await expect(page.locator('p:not(.sr-only)').filter({ hasText: /consultando…/i })).toBeHidden({ timeout: 120_000 });
  return before;
};

// Cada prueba abre un navegador nuevo (sin la preferencia guardada): activa el Modo IA desde la interfaz
const enableAiMode = async (page) => {
  await page.goto('/');
  const toggle = page.getByRole('switch', { name: /modo ia/i });
  await expect(toggle).toBeVisible({ timeout: 20_000 });
  if ((await toggle.getAttribute('aria-checked')) !== 'true') await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('heading', { name: /hola, /i })).toBeVisible({ timeout: 20_000 });
};

test.describe.configure({ mode: 'serial' });

test('1. por defecto la aplicación se ve como siempre y el Modo IA se activa desde la barra superior', async ({ page }) => {
  await login(page, 'admin');
  await page.goto('/');
  await page.waitForLoadState('networkidle').catch(() => {});
  await expect(page.getByRole('heading', { name: /hola/i })).toHaveCount(0); // sin Modo IA: el Dashboard de siempre
  const toggle = page.getByRole('switch', { name: /modo ia/i });
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await shot(page, 'ia_0_modo_clasico');

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('heading', { name: /hola, /i })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/¿en qué te puedo ayudar hoy\?/i)).toBeVisible();
  await expect(page.getByRole('link', { name: /asistente/i }).first()).toBeVisible(); // primera opción del menú
  await shot(page, 'ia_1_inicio_admin');

  // la preferencia se recuerda al recargar
  await page.reload();
  await expect(page.getByRole('heading', { name: /hola, /i })).toBeVisible({ timeout: 20_000 });
  // y el Dashboard clásico sigue disponible en /dashboard
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle').catch(() => {});
  expect(await page.locator('body').innerText()).toMatch(/dashboard/i);
});

test('2. el administrador pregunta cómo va la operación y recibe respuesta con tarjeta', async ({ page }) => {
  await login(page, 'admin');
  await enableAiMode(page);
  await page.getByRole('button', { name: /¿cómo va la operación hoy\?/i }).click();
  await expect(page.locator('p:not(.sr-only)').filter({ hasText: /consultando…/i })).toBeHidden({ timeout: 120_000 });
  // la tarjeta llega con el evento final de la respuesta en vivo: puede tardar más que el texto
  await expect(page.getByText(/^(Operación de hoy|Resumen del día)$/).first()).toBeVisible({ timeout: 60_000 });   // tarjeta con las cifras
  await expect(page.getByText(/retrasados/i).first()).toBeVisible({ timeout: 60_000 });
  const answer = await page.locator('[data-role="assistant"]').last().innerText();
  expect(answer).not.toMatch(/No pude procesar|error técnico/i);
  await shot(page, 'ia_2_operacion_admin');
});

test('3. un cliente activa el Modo IA, consulta sus paquetes y ubica uno', async ({ browser }) => {
  // el administrador crea un paquete a nombre del cliente
  const clientCtx = await browser.newContext({ locale: 'es-BO' });
  const clientPage = await clientCtx.newPage();
  await login(clientPage, 'client');
  const prof = await (await clientCtx.request.get(`${API}/iam/profile`, { headers: H })).json();
  const clientId = prof?.data?.id ?? prof?.user?.id ?? prof?.id ?? prof?.data?.user?.id;
  const adminCtx = await browser.newContext({ locale: 'es-BO' });
  const adminPage = await adminCtx.newPage();
  await login(adminPage, 'admin');
  const res = await adminCtx.request.post(`${API}/logistics/packages`, {
    headers: H,
    data: { origen: 'La Paz', destino: 'Oruro', peso: 1.5, description: TAG, recipient_name: `${TAG} Cliente`, recipient_phone: '60113322', sender_id: clientId },
  });
  expect(res.status(), await res.text()).toBe(201);
  const pkg = (await res.json()).data;
  created.packageIds.push(pkg.id);
  writeFileSync('e2e-results/created-ai.json', JSON.stringify(created, null, 2));
  await adminCtx.close();

  await enableAiMode(clientPage);
  await shot(clientPage, 'ia_3_inicio_cliente');

  // la primera coincidencia es el atajo de la pantalla de inicio (luego aparecen también las filas del historial)
  await clientPage.getByRole('button', { name: /¿qué paquetes tengo\?/i }).first().click();
  await expect(clientPage.locator('p:not(.sr-only)').filter({ hasText: /consultando…/i })).toBeHidden({ timeout: 120_000 });
  await expect(clientPage.getByRole('button', { name: new RegExp(pkg.tracking_code) })).toBeVisible({ timeout: 60_000 }); // tarjeta con SU paquete (llega con el evento final de la respuesta en vivo)
  await shot(clientPage, 'ia_4_lista_cliente');

  // toca el paquete de la tarjeta: el asistente lo ubica y muestra la ficha
  await clientPage.getByRole('button', { name: new RegExp(pkg.tracking_code) }).click();
  await expect(clientPage.locator('p:not(.sr-only)').filter({ hasText: /consultando…/i })).toBeHidden({ timeout: 120_000 });
  await expect(clientPage.getByText('Conductor', { exact: true })).toBeVisible();
  await expect(clientPage.getByText('Llegada estimada', { exact: true })).toBeVisible();
  await shot(clientPage, 'ia_5_ficha_paquete');
  await clientCtx.close();
});

test('4. el conductor ve su agenda con el asistente', async ({ page }) => {
  await login(page, 'driver');
  await enableAiMode(page);
  await expect(page.getByRole('button', { name: /¿qué entregas tengo hoy\?/i })).toBeVisible();
  await page.getByRole('button', { name: /¿qué entregas tengo hoy\?/i }).click();
  await expect(page.locator('p:not(.sr-only)').filter({ hasText: /consultando…/i })).toBeHidden({ timeout: 120_000 });
  const answer = await page.locator('[data-role="assistant"]').last().innerText();
  expect(answer).not.toMatch(/No pude procesar|error técnico/i);
  await shot(page, 'ia_6_agenda_conductor');
});

test('5. desactivar el Modo IA devuelve la aplicación de siempre', async ({ page }) => {
  await login(page, 'admin');
  await enableAiMode(page);
  const toggle = page.getByRole('switch', { name: /modo ia/i });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await page.goto('/');
  await page.waitForLoadState('networkidle').catch(() => {});
  await expect(page.getByRole('heading', { name: /hola, /i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /abrir asistente/i })).toBeVisible(); // vuelve el panel flotante
});
