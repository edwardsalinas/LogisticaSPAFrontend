import { test, expect } from '@playwright/test';
import { login } from './helpers.js';

/**
 * Ayuda por voz para ASIGNAR: «ayúdame a asignar un paquete». Con el backend, Supabase y la aplicación reales (micrófono y
 * altavoces simulados) y los datos de demostración (DEMO-LOGI, ver scripts/seed-demo.mjs en el backend): Logi pregunta qué
 * paquete (por el nombre), lo confirma, propone los viajes del mismo trayecto por su trayecto y hora (nunca por un
 * identificador), y al elegir uno lo asigna a la vista de todos. Al final se DESHACE la asignación con el mismo endpoint que usa
 * «Deshacer» (el paquete vuelve a pendiente), así los datos de demostración quedan como estaban.
 */
const API = process.env.E2E_API_URL || 'http://localhost:3000/api';
const H = { 'X-Requested-With': 'XMLHttpRequest' };
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

const installFakeVoice = () => {
  window.__spoken = []; window.__sr = { last: null, count: 0 };
  class FakeSR { constructor() { this.started = false; window.__sr.last = this; window.__sr.count += 1; } start() { this.started = true; this.onstart?.(); } stop() { this.finish(); } abort() { this.finish(); } finish() { if (!this.started) return; this.started = false; this.onend?.(); } }
  window.webkitSpeechRecognition = FakeSR; window.SpeechRecognition = FakeSR; window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { speaking: false, speak(u) { window.__spoken.push(u.text); setTimeout(() => u.onend && u.onend(), 30); }, cancel() {}, getVoices() { return [{ lang: 'es-ES', name: 'es' }]; }, addEventListener() {}, removeEventListener() {} } });
};
const hear = async (page, t) => { await page.waitForFunction(() => window.__sr.last && window.__sr.last.started, null, { timeout: 90000 }); await page.evaluate((x) => { const r = window.__sr.last; r.onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript: x }], { isFinal: true })] }); r.finish(); }, t); };
const lastSpoken = (page) => page.evaluate(() => window.__spoken.at(-1) ?? '');
const allSpoken = (page) => page.evaluate(() => window.__spoken.join(' | '));

test('«ayúdame a asignar un paquete»: pregunta, propone los viajes sin identificadores y lo asigna', async ({ browser }) => {
  test.setTimeout(360000);
  const ctx = await browser.newContext({ locale: 'es-BO', viewport: { width: 1366, height: 800 } });
  await ctx.addInitScript(installFakeVoice);
  const page = await ctx.newPage();
  await login(page, 'admin');

  const packages = async () => { const b = await (await ctx.request.get(`${API}/logistics/packages`, { headers: H })).json(); return Array.isArray(b) ? b : b.data; };
  const demo = (await packages()).find((p) => p.status === 'pendiente' && /^DEMO-LOGI/.test(p.description || '') && p.recipient_name === 'Rosa Quispe');
  test.skip(!demo, 'faltan los datos de demostración (node --env-file=.env scripts/seed-demo.mjs)');

  try {
    await page.goto('/dashboard');
    await page.getByRole('button', { name: /abrir asistente/i }).click();
    await page.getByRole('button', { name: /abrir el chat de voz/i }).click();
    await hear(page, 'ayúdame a asignar un paquete a un viaje');
    await expect.poll(() => lastSpoken(page), { timeout: 60000 }).toMatch(/qué paquete quieres asignar/i);

    await hear(page, 'rosa quispe');
    await expect.poll(() => lastSpoken(page), { timeout: 30000 }).toMatch(/Encontré el paquete .*Rosa Quispe.*¿Es ese\?/);
    await hear(page, 'sí');

    await expect.poll(() => lastSpoken(page), { timeout: 30000 }).toMatch(/¿Lo asigno ahí\?|¿A cuál lo asigno\?/);
    const offer = await lastSpoken(page);
    expect(offer).toMatch(/el viaje de La Paz a Oruro/);
    expect(await allSpoken(page)).not.toMatch(UUID);
    await hear(page, /¿Lo asigno ahí\?/.test(offer) ? 'sí' : 'el primero');

    // Logi lo hace a la vista de todos y el paquete queda asignado
    await expect.poll(async () => (await packages()).find((p) => p.id === demo.id)?.status, { timeout: 120000 }).toBe('asignado');
    await expect.poll(() => lastSpoken(page), { timeout: 60000 }).toMatch(/listo/i);
    expect(await allSpoken(page)).not.toMatch(UUID);
  } finally {
    // devolver el paquete a pendiente (el mismo endpoint de «Deshacer»)
    const now = (await packages()).find((p) => p.id === demo.id);
    if (now?.status === 'asignado') await ctx.request.post(`${API}/logistics/packages/${demo.id}/unassign`, { headers: H });
  }
  expect((await packages()).find((p) => p.id === demo.id)?.status).toBe('pendiente');
});
