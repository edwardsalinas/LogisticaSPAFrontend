import { test, expect } from '@playwright/test';
import { login, closeLeakedContexts } from './helpers.js';

// cierra los contextos de navegador de cada prueba (si no, se acumulan páginas vivas y el archivo se vuelve lento)
test.afterEach(closeLeakedContexts);

/**
 * Más avisos de Logi para el PERSONAL: siniestros y entregas fallidas, paquetes parados en agencia y viajes casi llenos.
 * Con el backend y Supabase reales se comprueba que el servidor los calcula (con los datos de demostración, scripts/seed-demo.mjs).
 * Como el servidor muestra como máximo 3 avisos a la vez (los más urgentes), cada tipo se ve en el globo de Logi con la respuesta
 * del servidor simulada. No cambia datos.
 */
const API = process.env.E2E_API_URL || 'http://localhost:3000/api';
const H = { 'X-Requested-With': 'XMLHttpRequest' };

test('el servidor calcula los avisos nuevos con datos reales: siniestro y viaje casi lleno', async ({ browser }) => {
  const ctx = await browser.newContext(); await login(await ctx.newPage(), 'admin');
  const r = await ctx.request.get(`${API}/ai-agent/alerts`, { headers: H });
  expect(r.status()).toBe(200);
  const alerts = (await r.json()).data;
  test.skip(!alerts.some((a) => a.type === 'incident'), 'faltan los datos de demostración del personal (scripts/seed-demo.mjs)');
  const incident = alerts.find((a) => a.type === 'incident');
  expect(incident.severity).toBe('high');
  expect(incident.text).toMatch(/paquete con siniestro \(TRK-.+\)\. Siguen sin resolverse\./);
  expect(alerts.length).toBeLessThanOrEqual(3); // como mucho tres, los más urgentes
  const full = alerts.find((a) => a.type === 'trip_full');
  if (full) {
    expect(full.text).toMatch(/lleva \d+ kg de \d+ kg \(\d+ %\)/);
    expect(full.text).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/); // nunca un identificador de viaje
  }
});

const CASES = [
  {
    name: 'siniestro',
    alert: { id: 'incident:x', type: 'incident', severity: 'high', title: 'Hay paquetes con siniestro', text: '1 paquete con siniestro (TRK-1). Siguen sin resolverse.', action: { kind: 'navigate', to: '/logistics/packages/abc', label: 'Ver el paquete' } },
    button: 'Ver el paquete', url: /\/logistics\/packages\/abc$/,
  },
  {
    name: 'paquete parado en agencia',
    alert: { id: 'stuck_agency:x', type: 'stuck_agency', severity: 'medium', title: 'Un paquete lleva días en agencia', text: 'El paquete TRK-2 lleva 3 días en agencia sin moverse.', action: { kind: 'navigate', to: '/tracking', label: 'Ver el seguimiento' } },
    button: 'Ver el seguimiento', url: /\/tracking$/,
  },
  {
    name: 'viaje casi lleno',
    alert: { id: 'trip_full:x', type: 'trip_full', severity: 'medium', title: 'Un viaje está casi lleno', text: 'el viaje de La Paz a Oruro de hoy a las 15:00 lleva 950 kg de 1000 kg (95 %): quedan 50 kg.', action: { kind: 'navigate', to: '/logistics/routes', label: 'Ver los viajes' } },
    button: 'Ver los viajes', url: /\/logistics\/routes$/,
  },
];

for (const c of CASES) {
  test(`Logi avisa en su globo: ${c.name}, con su botón`, async ({ browser }) => {
    test.setTimeout(120_000);
    const ctx = await browser.newContext({ locale: 'es-BO', viewport: { width: 1366, height: 800 } });
    const page = await ctx.newPage();
    await login(page, 'admin');
    await page.route('**/ai-agent/alerts', (route) => route.fulfill({ json: { success: true, data: [c.alert] } }));
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    const bubble = page.getByRole('group', { name: 'Aviso de Logi' });
    await expect(bubble).toBeVisible({ timeout: 60_000 });
    await expect(bubble).toContainText(c.alert.title);
    await expect(bubble).toContainText(c.alert.text.slice(0, 30));
    if (c.alert.severity === 'high') await expect(page.locator('.logi--worried').first()).toBeVisible(); // lo urgente preocupa a Logi
    await page.screenshot({ path: `e2e-results/aviso-personal-${c.alert.type}.png` });
    await bubble.getByRole('button', { name: c.button }).click();
    await expect(page).toHaveURL(c.url, { timeout: 30_000 });
  });
}
