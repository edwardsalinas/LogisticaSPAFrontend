import { test, expect } from '@playwright/test';
import { login } from './helpers.js';

/**
 * Avisos proactivos de Logi, modo «Enséñame» y botón de pausa, con backend y Supabase reales. No crea datos:
 *  - el aviso sale solo si hay una excepción real (si no la hay, se comprueba que Logi NO inventa ninguno);
 *  - «Enséñame a registrar un paquete» rellena el formulario a la vista y NO guarda nada (el total de paquetes no cambia);
 *  - el botón de pausa de Logi es visible y recuerda la elección.
 */
const API = process.env.E2E_API_URL || 'http://localhost:3000/api';
const H = { 'X-Requested-With': 'XMLHttpRequest' };

const countPackages = async (ctx) => {
  const res = await ctx.request.get(`${API}/logistics/packages`, { headers: H });
  expect(res.status()).toBe(200);
  const body = await res.json();
  return (Array.isArray(body) ? body : body.data).length;
};

test('aviso proactivo: sale solo con una excepción real, se puede posponer y silenciar', async ({ browser }) => {
  test.setTimeout(120_000);
  const ctx = await browser.newContext({ locale: 'es-BO', viewport: { width: 1366, height: 800 } });
  const page = await ctx.newPage();
  await login(page, 'admin');
  const alertsRes = await ctx.request.get(`${API}/ai-agent/alerts`, { headers: H });
  expect(alertsRes.status()).toBe(200);
  const real = (await alertsRes.json()).data ?? [];

  await page.goto('/dashboard');
  const bubble = page.getByRole('group', { name: 'Aviso de Logi' });
  if (real.length === 0) {
    await page.waitForTimeout(7000);
    await expect(bubble).toHaveCount(0); // sin excepciones reales, Logi no inventa avisos
    return;
  }
  await expect(bubble).toBeVisible({ timeout: 20_000 });
  await expect(bubble.getByRole('button', { name: 'Después' })).toBeVisible();
  await page.screenshot({ path: 'e2e-results/logi-aviso.png' });

  await bubble.getByRole('button', { name: 'Después' }).click();
  await expect(bubble).toHaveCount(0);
  // pospuesto: al recargar no vuelve a salir enseguida (como mucho un aviso por hora)
  await page.reload();
  await page.waitForTimeout(7000);
  await expect(bubble).toHaveCount(0);
});

test('«Enséñame»: Logi rellena el formulario a la vista y no guarda nada', async ({ browser }) => {
  test.setTimeout(180_000);
  const ctx = await browser.newContext({ locale: 'es-BO', viewport: { width: 1366, height: 800 } });
  const page = await ctx.newPage();
  await login(page, 'admin');
  const before = await countPackages(ctx);

  await page.goto('/dashboard');
  await page.getByRole('button', { name: /abrir asistente/i }).click();
  await page.getByRole('button', { name: /enséñame a registrar un paquete/i }).click();
  await expect(page.getByText(/demostración terminada/i).first()).toBeVisible({ timeout: 90_000 });
  await page.waitForTimeout(1500);

  expect(await countPackages(ctx)).toBe(before); // nada se guardó
});

test('botón de pausa de Logi: visible, accesible y recuerda la elección', async ({ browser }) => {
  const ctx = await browser.newContext({ locale: 'es-BO', viewport: { width: 1366, height: 800 } });
  const page = await ctx.newPage();
  await login(page, 'admin');
  await page.goto('/dashboard');
  const pause = page.getByRole('button', { name: 'Pausar el paseo de Logi' });
  await expect(pause).toBeVisible();
  await pause.click();
  await expect(page.getByRole('button', { name: 'Reanudar el paseo de Logi' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Reanudar el paseo de Logi' })).toBeVisible();
  await page.getByRole('button', { name: 'Reanudar el paseo de Logi' }).click();
  await expect(page.getByRole('button', { name: 'Pausar el paseo de Logi' })).toBeVisible();
});
