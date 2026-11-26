import { test, expect } from '@playwright/test';
import { login, closeLeakedContexts } from './helpers.js';

// cierra los contextos de navegador de cada prueba (si no, se acumulan páginas vivas y el archivo se vuelve lento)
test.afterEach(closeLeakedContexts);

/**
 * Mando por voz de la aplicación, con el backend, Supabase y la aplicación reales (micrófono y altavoces simulados): se habla con
 * Logi para moverse por las pantallas («llévame a Viajes», «muéstrame los paquetes entregados», «abre los conductores»), pausarlo,
 * y cerrar el chat de voz. No gasta consultas del asistente (se atiende en el navegador) y no cambia datos.
 */
const installFakeVoice = () => {
  window.__spoken = []; window.__sr = { last: null, count: 0 };
  class FakeSR { constructor() { this.started = false; window.__sr.last = this; window.__sr.count += 1; } start() { this.started = true; this.onstart?.(); } stop() { this.finish(); } abort() { this.finish(); } finish() { if (!this.started) return; this.started = false; this.onend?.(); } }
  window.webkitSpeechRecognition = FakeSR; window.SpeechRecognition = FakeSR; window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { speaking: false, speak(u) { window.__spoken.push(u.text); setTimeout(() => u.onend && u.onend(), 30); }, cancel() {}, getVoices() { return [{ lang: 'es-ES', name: 'es' }]; }, addEventListener() {}, removeEventListener() {} } });
};
const hear = async (page, t) => { await page.waitForFunction(() => window.__sr.last && window.__sr.last.started, null, { timeout: 60000 }); await page.evaluate((x) => { const r = window.__sr.last; r.onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript: x }], { isFinal: true })] }); r.finish(); }, t); };
const lastSpoken = (page) => page.evaluate(() => window.__spoken.at(-1) ?? '');

const openVoice = async (page) => {
  await page.getByRole('button', { name: /abrir asistente/i }).click();
  await page.getByRole('button', { name: /abrir el chat de voz/i }).click();
  await expect(page.getByTestId('voice-compact')).toBeVisible();
};

test('el administrador se mueve por la aplicación hablando, y la barra de voz sigue abierta', async ({ browser }) => {
  test.setTimeout(240_000);
  const ctx = await browser.newContext({ locale: 'es-BO', viewport: { width: 1366, height: 800 } });
  await ctx.addInitScript(installFakeVoice);
  const page = await ctx.newPage();
  await login(page, 'admin');
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await openVoice(page);

  const chats = [];
  page.on('request', (r) => { if (/ai-agent\/chat/.test(r.url()) && r.method() === 'POST') chats.push(r.url()); });

  await hear(page, 'llévame a Viajes');
  await expect(page).toHaveURL(/\/logistics\/routes$/, { timeout: 30_000 });
  await expect.poll(() => lastSpoken(page), { timeout: 15_000 }).toBe('Voy a Viajes.');
  await expect(page.getByTestId('voice-compact')).toBeVisible(); // sigue abierta: se pueden encadenar órdenes

  await hear(page, 'muéstrame los paquetes entregados');
  await expect(page).toHaveURL(/\/logistics\/packages$/, { timeout: 30_000 });
  await expect(page.getByRole('heading', { name: /historial de despachos/i }).first()).toBeVisible({ timeout: 30_000 }); // la pestaña del histórico
  await page.screenshot({ path: 'e2e-results/mando-1-historico.png' });

  await hear(page, 'ahora abre los paquetes');
  await expect(page.getByRole('heading', { name: /panel de despachos/i }).first()).toBeVisible({ timeout: 30_000 }); // vuelve a los operativos

  await hear(page, 'abre los conductores');
  await expect(page).toHaveURL(/\/fleet$/, { timeout: 30_000 });
  await expect.poll(() => page.evaluate(() => window.sessionStorage.getItem('logisticaspa:filtros:flota:pestana')), { timeout: 15_000 }).toBe('"drivers"');

  expect(chats).toEqual([]); // nada de esto gastó una consulta al asistente
});

test('«quédate quieto» pausa el paseo de Logi y «camina» lo reanuda; «gracias, cierra» cierra la barra', async ({ browser }) => {
  test.setTimeout(180_000);
  const ctx = await browser.newContext({ locale: 'es-BO', viewport: { width: 1366, height: 800 } });
  await ctx.addInitScript(installFakeVoice);
  const page = await ctx.newPage();
  await login(page, 'admin');
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await openVoice(page);
  await expect(page.getByRole('button', { name: 'Pausar el paseo de Logi' })).toBeVisible();

  await hear(page, 'quédate quieto');
  await expect(page.getByRole('button', { name: 'Reanudar el paseo de Logi' })).toBeVisible({ timeout: 15_000 });
  await expect.poll(() => lastSpoken(page), { timeout: 15_000 }).toBe('Me quedo quieto.');

  await hear(page, 'camina');
  await expect(page.getByRole('button', { name: 'Pausar el paseo de Logi' })).toBeVisible({ timeout: 15_000 });

  await hear(page, 'gracias, cierra');
  await expect.poll(() => lastSpoken(page), { timeout: 15_000 }).toBe('Hasta luego.');
  await expect(page.getByTestId('voice-compact')).toHaveCount(0, { timeout: 15_000 });
});

test('cada rol solo navega a lo suyo: el cliente no puede ir a la flota y Logi se lo explica', async ({ browser }) => {
  test.setTimeout(180_000);
  const ctx = await browser.newContext({ locale: 'es-BO', viewport: { width: 1366, height: 800 } });
  await ctx.addInitScript(installFakeVoice);
  const page = await ctx.newPage();
  await login(page, 'client');
  await page.goto('/logistics/packages', { waitUntil: 'domcontentloaded' });
  await openVoice(page);

  await hear(page, 'abre la flota');
  await expect.poll(() => lastSpoken(page), { timeout: 15_000 }).toBe('No tienes la Flota disponible con tu rol.');
  await expect(page).toHaveURL(/\/logistics\/packages$/);

  await hear(page, 'llévame a tracking');
  await expect(page).toHaveURL(/\/tracking$/, { timeout: 30_000 });
});
