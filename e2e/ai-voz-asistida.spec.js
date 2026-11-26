import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { login, closeLeakedContexts } from './helpers.js';

// cierra los contextos de navegador de cada prueba (si no, se acumulan páginas vivas y el archivo se vuelve lento)
test.afterEach(closeLeakedContexts);

/**
 * Ayuda por voz: «ayúdame a crear un paquete». Con el backend, Supabase y la aplicación reales (micrófono y altavoces
 * simulados): se abre la barra de voz compacta (la página sigue usable), Logi va a Paquetes, abre el formulario, pregunta
 * campo por campo, lee el resumen y, al oír «sí», registra UN paquete. Los datos llevan la marca E2E-<sello> en el contenido
 * (ids en e2e-results/created-voz-asistida.json, ver e2e-cleanup).
 */
const STAMP = Date.now();
const TAG = `E2E-${STAMP}`;
const created = { tag: TAG, routeIds: [], packageIds: [] };
const API = process.env.E2E_API_URL || 'http://localhost:3000/api';
const H = { 'X-Requested-With': 'XMLHttpRequest' };
const save = () => writeFileSync('e2e-results/created-voz-asistida.json', JSON.stringify(created, null, 2));

const installFakeVoice = () => {
  window.__spoken = [];
  window.__sr = { last: null, count: 0 };
  class FakeSR {
    constructor() { this.started = false; window.__sr.last = this; window.__sr.count += 1; }
    start() { this.started = true; }
    stop() { this.finish(); }
    abort() { this.finish(); }
    finish() { if (!this.started) return; this.started = false; this.onend?.(); }
  }
  window.webkitSpeechRecognition = FakeSR;
  window.SpeechRecognition = FakeSR;
  window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: { speaking: false, speak(u) { window.__spoken.push(u.text); setTimeout(() => u.onend && u.onend(), 30); }, cancel() {}, getVoices() { return [{ lang: 'es-ES', name: 'es' }]; }, addEventListener() {}, removeEventListener() {} },
  });
};

/** La persona dice una frase: espera a que haya una escucha en marcha y la entrega. */
const userSays = async (page, text) => {
  await page.waitForFunction(() => window.__sr.last && window.__sr.last.started, null, { timeout: 90_000 });
  await page.evaluate((t) => {
    const rec = window.__sr.last;
    rec.onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript: t }], { isFinal: true })] });
    rec.finish();
  }, text);
};
const lastSpoken = (page) => page.evaluate(() => window.__spoken.at(-1) ?? '');

test('«ayúdame a crear un paquete»: barra compacta, Logi pregunta y registra con un «sí»', async ({ browser }) => {
  test.setTimeout(300_000);
  const ctx = await browser.newContext({ locale: 'es-BO', viewport: { width: 1366, height: 800 } });
  await ctx.addInitScript(installFakeVoice);
  const page = await ctx.newPage();
  await login(page, 'admin');

  // un trayecto real: una ciudad de origen con viaje y uno de sus destinos
  const rr = await ctx.request.get(`${API}/logistics/routes`, { headers: H });
  const routes = ((await rr.json()).data ?? []).filter((r) => r.origin && r.destination);
  expect(routes.length).toBeGreaterThan(0);
  const { origin, destination } = routes[0];

  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /abrir asistente/i }).click();
  await page.getByRole('button', { name: /abrir el chat de voz/i }).click();

  // barra compacta: NO es un diálogo modal y la página sigue usable
  const bar = page.getByTestId('voice-compact');
  await expect(bar).toBeVisible();
  expect(await page.evaluate(() => document.getElementById('root').hasAttribute('inert'))).toBe(false);
  await expect(page.getByRole('dialog', { name: /chat de voz/i })).toHaveCount(0);
  await page.screenshot({ path: 'e2e-results/voz-asistida-1-barra.png' });

  await userSays(page, 'ayúdame a crear un paquete');
  await expect(page).toHaveURL(/\/logistics\/packages/, { timeout: 30_000 });
  await expect(page.locator('form[aria-label], form').first()).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => lastSpoken(page), { timeout: 30_000 }).toMatch(/de dónde sale/i);
  await page.screenshot({ path: 'e2e-results/voz-asistida-2-pregunta.png' });

  await userSays(page, origin);
  await expect.poll(() => lastSpoken(page), { timeout: 30_000 }).toMatch(/a dónde va/i);
  await expect(page.locator('select[name="origen"]')).toHaveValue(origin);

  await userSays(page, destination);
  await expect.poll(() => lastSpoken(page), { timeout: 30_000 }).toMatch(/quién lo envía/i);
  await userSays(page, 'carlos prueba');
  await expect.poll(() => lastSpoken(page), { timeout: 30_000 }).toMatch(/cuántos kilos/i);
  await userSays(page, 'tres y medio');
  await expect.poll(() => lastSpoken(page), { timeout: 30_000 }).toMatch(/a nombre de quién/i);
  await userSays(page, 'ana prueba');
  await expect.poll(() => lastSpoken(page), { timeout: 30_000 }).toMatch(/tiene teléfono/i);
  await userSays(page, 'ninguno');
  await expect.poll(() => lastSpoken(page), { timeout: 30_000 }).toMatch(/qué contiene/i);
  await userSays(page, TAG);
  await expect.poll(() => lastSpoken(page), { timeout: 30_000 }).toMatch(/¿Lo registro\?/);
  expect(await lastSpoken(page)).toContain('3.5 kilos');
  await expect(page.locator('input[name="peso"]')).toHaveValue('3.5');
  await expect(page.locator('input[name="recipient_name"]')).toHaveValue('Ana Prueba');
  await page.screenshot({ path: 'e2e-results/voz-asistida-3-resumen.png' });

  // antes del «sí» NO existe nada
  const find = async () => {
    const res = await ctx.request.get(`${API}/logistics/packages`, { headers: H });
    const body = await res.json();
    return (Array.isArray(body) ? body : body.data).filter((p) => p.description === TAG);
  };
  expect(await find()).toHaveLength(0);

  await userSays(page, 'sí, hazlo');
  await expect.poll(async () => (await find()).length, { timeout: 30_000 }).toBe(1);
  const [pkg] = await find();
  created.packageIds.push(pkg.id); save();
  expect(pkg.origen).toBe(origin);
  expect(pkg.destino).toBe(destination);
  expect(Number(pkg.peso)).toBe(3.5);
  expect(pkg.recipient_name).toBe('Ana Prueba');
  expect(pkg.sender_name).toBe('Carlos Prueba');
  await expect.poll(() => lastSpoken(page), { timeout: 30_000 }).toMatch(/registré el paquete/i);
  await page.screenshot({ path: 'e2e-results/voz-asistida-4-listo.png' });
});

test('«cancela» a mitad de camino no crea nada y deja el formulario abierto', async ({ browser }) => {
  test.setTimeout(240_000);
  const ctx = await browser.newContext({ locale: 'es-BO', viewport: { width: 1366, height: 800 } });
  await ctx.addInitScript(installFakeVoice);
  const page = await ctx.newPage();
  await login(page, 'admin');
  const before = async () => { const b = await (await ctx.request.get(`${API}/logistics/packages`, { headers: H })).json(); return (Array.isArray(b) ? b : b.data).length; };
  const n0 = await before();

  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /abrir asistente/i }).click();
  await page.getByRole('button', { name: /abrir el chat de voz/i }).click();
  await userSays(page, 'quiero registrar un paquete');
  await expect.poll(() => lastSpoken(page), { timeout: 60_000 }).toMatch(/de dónde sale/i);
  await userSays(page, 'cancela');
  await expect.poll(() => lastSpoken(page), { timeout: 30_000 }).toMatch(/lo dejo aquí/i);
  await expect(page.locator('select[name="origen"]')).toBeVisible(); // el formulario sigue abierto
  expect(await before()).toBe(n0);
});
