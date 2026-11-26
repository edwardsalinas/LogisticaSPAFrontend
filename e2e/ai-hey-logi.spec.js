import { test, expect } from '@playwright/test';
import { login, closeLeakedContexts } from './helpers.js';

// cierra los contextos de navegador de cada prueba (si no, se acumulan páginas vivas y el archivo se vuelve lento)
test.afterEach(closeLeakedContexts);

/**
 * «Hey Logi» con la aplicación, el backend y la IA reales (micrófono y altavoces simulados). No crea datos: siempre se cancela
 * antes de registrar. Se comprueba que: viene apagado; al activarlo se ve el aviso de micrófono abierto; lo que no es «hey Logi»
 * no despierta a nadie; «hey Logi» abre la barra de voz y Logi responde «Dime»; y «hey Logi, ayúdame a crear un paquete»
 * arranca la ayuda en la misma frase.
 */
const installFakeVoice = () => {
  window.__spoken = [];
  window.__sr = { last: null, count: 0 };
  class FakeSR {
    constructor() { this.started = false; window.__sr.last = this; window.__sr.count += 1; }
    start() { this.started = true; this.onstart?.(); }
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
const enableWake = () => window.sessionStorage.setItem('logisticaspa:logi:hey-logi', '1');

const hear = async (page, text, isFinal = true) => {
  await page.waitForFunction(() => window.__sr.last && window.__sr.last.started, null, { timeout: 60_000 });
  await page.evaluate(([t, fin]) => {
    const rec = window.__sr.last;
    rec.onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript: t }], { isFinal: fin })] });
    if (fin) rec.finish();
  }, [text, isFinal]);
};
const lastSpoken = (page) => page.evaluate(() => window.__spoken.at(-1) ?? '');

test('viene apagado: sin aviso de micrófono y sin abrir ninguna escucha', async ({ browser }) => {
  const ctx = await browser.newContext({ locale: 'es-BO', viewport: { width: 1366, height: 800 } });
  await ctx.addInitScript(installFakeVoice);
  const page = await ctx.newPage();
  await login(page, 'admin');
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await expect(page.getByTestId('wake-indicator')).toHaveCount(0);
  expect(await page.evaluate(() => window.__sr.count)).toBe(0);
});

test('activado: aviso visible, ignora lo que no es «hey Logi», y «hey Logi» abre la barra y dice «Dime»', async ({ browser }) => {
  test.setTimeout(180_000);
  const ctx = await browser.newContext({ locale: 'es-BO', viewport: { width: 1366, height: 800 } });
  await ctx.addInitScript(installFakeVoice);
  await ctx.addInitScript(enableWake);
  const page = await ctx.newPage();
  await login(page, 'admin');
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

  const indicator = page.getByTestId('wake-indicator');
  await expect(indicator).toContainText(/hey logi/i);
  await expect(indicator.getByRole('button', { name: 'Apagar' })).toBeVisible();
  await page.screenshot({ path: 'e2e-results/hey-logi-1-aviso.png' });

  await hear(page, 'abre la página de login por favor');
  await page.waitForTimeout(1500);
  await expect(page.getByTestId('voice-compact')).toHaveCount(0); // no es «hey Logi»

  await page.waitForFunction(() => window.__sr.last && window.__sr.last.started, null, { timeout: 15_000 }); // sigue escuchando
  await hear(page, 'hey logi');
  await expect(page.getByTestId('voice-compact')).toBeVisible({ timeout: 15_000 });
  await expect.poll(() => lastSpoken(page), { timeout: 15_000 }).toMatch(/^Dime/);
  await expect(indicator).toContainText(/chat de voz abierto/i);
  await page.screenshot({ path: 'e2e-results/hey-logi-2-dime.png' });
});

test('«hey Logi, ayúdame a crear un paquete» en una sola frase arranca la ayuda; «cancela» no crea nada', async ({ browser }) => {
  test.setTimeout(240_000);
  const ctx = await browser.newContext({ locale: 'es-BO', viewport: { width: 1366, height: 800 } });
  await ctx.addInitScript(installFakeVoice);
  await ctx.addInitScript(enableWake);
  const page = await ctx.newPage();
  await login(page, 'admin');
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('wake-indicator')).toBeVisible();

  await hear(page, 'Hey Logi, ayúdame a crear un paquete');
  await expect(page).toHaveURL(/\/logistics\/packages/, { timeout: 30_000 });
  await expect.poll(() => lastSpoken(page), { timeout: 60_000 }).toMatch(/de dónde sale/i);
  await hear(page, 'cancela');
  await expect.poll(() => lastSpoken(page), { timeout: 30_000 }).toMatch(/lo dejo aquí/i);
  await expect(page.locator('select[name="origen"]')).toBeVisible();
});

test('«Apagar» cierra la escucha y el aviso desaparece', async ({ browser }) => {
  const ctx = await browser.newContext({ locale: 'es-BO', viewport: { width: 1366, height: 800 } });
  await ctx.addInitScript(installFakeVoice);
  await ctx.addInitScript(enableWake);
  const page = await ctx.newPage();
  await login(page, 'admin');
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  const indicator = page.getByTestId('wake-indicator');
  await expect(indicator).toBeVisible();
  await indicator.getByRole('button', { name: 'Apagar' }).click();
  await expect(indicator).toHaveCount(0);
  expect(await page.evaluate(() => window.sessionStorage.getItem('logisticaspa:logi:hey-logi'))).toBeNull();
  expect(await page.evaluate(() => window.__sr.last?.started ?? false)).toBe(false);
});
