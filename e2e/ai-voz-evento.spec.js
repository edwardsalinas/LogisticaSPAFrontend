import { test, expect } from '@playwright/test';
import { login, closeLeakedContexts } from './helpers.js';

// cierra los contextos de navegador de cada prueba (si no, se acumulan páginas vivas y el archivo se vuelve lento)
test.afterEach(closeLeakedContexts);

/**
 * Ayuda por voz para registrar un EVENTO de seguimiento, con el backend, Supabase y la aplicación reales (micrófono y altavoces
 * simulados) y los datos de demostración. Se prueba el endpoint nuevo (POST /ai-agent/suggestions/event) y la conversación completa
 * hasta la última pregunta, a la que se responde «no»: así NO se registra nada y los datos de demostración quedan como estaban.
 */
const API = process.env.E2E_API_URL || 'http://localhost:3000/api';
const H = { 'X-Requested-With': 'XMLHttpRequest' };

const installFakeVoice = () => {
  window.__spoken = []; window.__sr = { last: null, count: 0 };
  class FakeSR { constructor() { this.started = false; window.__sr.last = this; window.__sr.count += 1; } start() { this.started = true; this.onstart?.(); } stop() { this.finish(); } abort() { this.finish(); } finish() { if (!this.started) return; this.started = false; this.onend?.(); } }
  window.webkitSpeechRecognition = FakeSR; window.SpeechRecognition = FakeSR; window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { speaking: false, speak(u) { window.__spoken.push(u.text); setTimeout(() => u.onend && u.onend(), 30); }, cancel() {}, getVoices() { return [{ lang: 'es-ES', name: 'es' }]; }, addEventListener() {}, removeEventListener() {} } });
};
const hear = async (page, t) => { await page.waitForFunction(() => window.__sr.last && window.__sr.last.started, null, { timeout: 90000 }); await page.evaluate((x) => { const r = window.__sr.last; r.onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript: x }], { isFinal: true })] }); r.finish(); }, t); };
const lastSpoken = (page) => page.evaluate(() => window.__spoken.at(-1) ?? '');

test('endpoint POST /ai-agent/suggestions/event: personal sí, cliente no, datos inválidos 400, y no escribe', async ({ browser }) => {
  const admin = await browser.newContext(); await login(await admin.newPage(), 'admin');
  const packages = async (ctx) => { const b = await (await ctx.request.get(`${API}/logistics/packages`, { headers: H })).json(); return Array.isArray(b) ? b : b.data; };
  const demo = (await packages(admin)).find((p) => p.status === 'pendiente' && /^DEMO-LOGI/.test(p.description || ''));
  test.skip(!demo, 'faltan los datos de demostración (scripts/seed-demo.mjs)');

  const ok = await admin.request.post(`${API}/ai-agent/suggestions/event`, { headers: H, data: { codes: [demo.tracking_code], status: 'en_agencia', note: 'Prueba' } });
  expect(ok.status()).toBe(200);
  const proposal = (await ok.json()).data.action;
  expect(proposal.type).toBe('register_tracking_event');
  expect(proposal.ui.fill.values.items[0].tracking_code).toBe(demo.tracking_code);
  expect((await packages(admin)).find((p) => p.id === demo.id).status).toBe('pendiente'); // proponer no cambia nada
  await admin.request.post(`${API}/ai-agent/actions/${proposal.id}/cancel`, { headers: H });

  const bad = await admin.request.post(`${API}/ai-agent/suggestions/event`, { headers: H, data: { codes: [demo.tracking_code], status: 'entregado' } });
  expect(bad.status()).toBe(400);
  const client = await browser.newContext(); await login(await client.newPage(), 'client');
  const denied = await client.request.post(`${API}/ai-agent/suggestions/event`, { headers: H, data: { codes: [demo.tracking_code], status: 'en_agencia' } });
  expect(denied.status()).toBe(403);
});

test('«ayúdame a registrar un evento»: pregunta paquete, estado y nota, lee lo que hará y un «no» no registra nada', async ({ browser }) => {
  test.setTimeout(300000);
  const ctx = await browser.newContext({ locale: 'es-BO', viewport: { width: 1366, height: 800 } });
  await ctx.addInitScript(installFakeVoice);
  const page = await ctx.newPage();
  await login(page, 'admin');
  const packages = async () => { const b = await (await ctx.request.get(`${API}/logistics/packages`, { headers: H })).json(); return Array.isArray(b) ? b : b.data; };
  const demo = (await packages()).find((p) => p.status === 'pendiente' && /^DEMO-LOGI/.test(p.description || '') && p.recipient_name === 'Rosa Quispe');
  test.skip(!demo, 'faltan los datos de demostración');

  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /abrir asistente/i }).click();
  await page.getByRole('button', { name: /abrir el chat de voz/i }).click();
  await hear(page, 'ayúdame a registrar un evento de seguimiento');
  await expect.poll(() => lastSpoken(page), { timeout: 60000 }).toMatch(/a qué paquete le registro el evento/i);
  await hear(page, 'rosa quispe');
  await expect.poll(() => lastSpoken(page), { timeout: 30000 }).toMatch(/Encontré el paquete .*Rosa Quispe.*¿Es ese\?/);
  await hear(page, 'sí');
  await expect.poll(() => lastSpoken(page), { timeout: 30000 }).toMatch(/qué pasó con el paquete/i);
  await hear(page, 'llegó a la agencia');
  await expect.poll(() => lastSpoken(page), { timeout: 30000 }).toMatch(/agregar una nota/i);
  await hear(page, 'ninguna');
  await expect.poll(() => lastSpoken(page), { timeout: 30000 }).toMatch(/está en agencia\. ¿Lo hago\?/);
  await hear(page, 'no');
  await expect.poll(() => lastSpoken(page), { timeout: 30000 }).toMatch(/no lo registro/i);
  expect((await packages()).find((p) => p.id === demo.id).status).toBe('pendiente'); // nada cambió
});
