import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { login } from './helpers.js';

/**
 * Accesibilidad de la voz con axe-core en el navegador real: la barra compacta, el aviso de «Hey Logi» y la ayuda guiada.
 * Se revisa SOLO lo que añaden estos componentes (no el resto de la pantalla) y se exige cero problemas graves, más lo que axe
 * no ve: teclado (Tab llega a los controles, Escape cierra) y que la página NO quede inerte (la barra no es modal).
 */
const AXE = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const installFakeVoice = () => {
  window.__spoken = []; window.__sr = { last: null, count: 0 };
  class FakeSR { constructor() { this.started = false; window.__sr.last = this; window.__sr.count += 1; } start() { this.started = true; this.onstart?.(); } stop() { this.finish(); } abort() { this.finish(); } finish() { if (!this.started) return; this.started = false; this.onend?.(); } }
  window.webkitSpeechRecognition = FakeSR; window.SpeechRecognition = FakeSR; window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { speaking: false, speak(u) { window.__spoken.push(u.text); setTimeout(() => u.onend && u.onend(), 30); }, cancel() {}, getVoices() { return [{ lang: 'es-ES', name: 'es' }]; }, addEventListener() {}, removeEventListener() {} } });
};
const hear = async (page, t) => { await page.waitForFunction(() => window.__sr.last && window.__sr.last.started, null, { timeout: 60000 }); await page.evaluate((x) => { const r = window.__sr.last; r.onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript: x }], { isFinal: true })] }); r.finish(); }, t); };

/** Problemas de axe dentro de los selectores dados (serios o críticos, y también los de contraste/nombre de botones). */
const audit = async (page, selectors) => {
  await page.addScriptTag({ content: AXE });
  return page.evaluate(async (sels) => {
    const out = [];
    for (const sel of sels) {
      const el = document.querySelector(sel);
      if (!el) { out.push({ id: 'missing', target: sel }); continue; }
      const res = await window.axe.run(el, { resultTypes: ['violations'] });
      for (const v of res.violations) out.push({ id: v.id, impact: v.impact, target: sel, nodes: v.nodes.map((n) => n.html.slice(0, 120)) });
    }
    return out;
  }, selectors);
};

test.describe('Accesibilidad de la voz', () => {
  test('barra compacta y aviso de «Hey Logi»: sin problemas; teclado y página activa', async ({ browser }) => {
    test.setTimeout(180000);
    const ctx = await browser.newContext({ locale: 'es-BO', viewport: { width: 1366, height: 800 } });
    await ctx.addInitScript(installFakeVoice);
    await ctx.addInitScript(() => window.sessionStorage.setItem('logisticaspa:logi:hey-logi', '1'));
    const page = await ctx.newPage();
    await login(page, 'admin');
    await page.goto('/dashboard');
    await expect(page.getByTestId('wake-indicator')).toBeVisible();
    expect(await audit(page, ['[data-testid="wake-indicator"]'])).toEqual([]);

    await hear(page, 'hey logi');
    const bar = page.getByTestId('voice-compact');
    await expect(bar).toBeVisible();
    expect(await audit(page, ['[data-testid="voice-compact"]'])).toEqual([]);

    // la página NO está inerte: se puede usar el menú mientras la barra está abierta
    expect(await page.evaluate(() => document.getElementById('root').hasAttribute('inert'))).toBe(false);
    await page.getByRole('link', { name: /paquetes/i }).first().click();
    await expect(page).toHaveURL(/\/logistics\/packages/);

    // teclado: cada control de la barra se alcanza con Tab y tiene nombre accesible
    const names = await bar.getByRole('button').evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-label') || b.textContent.trim()));
    expect(names.every(Boolean)).toBe(true);
    expect(names.join('|')).toMatch(/Hablar|Dejar de escuchar/);
    await bar.getByRole('button', { name: /salir del chat de voz/i }).focus();
    await page.keyboard.press('Enter');
    await expect(bar).toHaveCount(0);
  });

  test('Escape cierra la barra; el anuncio de estado es un role=status', async ({ browser }) => {
    const ctx = await browser.newContext({ locale: 'es-BO', viewport: { width: 1366, height: 800 } });
    await ctx.addInitScript(installFakeVoice);
    const page = await ctx.newPage();
    await login(page, 'admin');
    await page.goto('/dashboard');
    await page.getByRole('button', { name: /abrir asistente/i }).click();
    await page.getByRole('button', { name: /abrir el chat de voz/i }).click();
    const bar = page.getByTestId('voice-compact');
    await expect(bar).toBeVisible();
    await expect(bar.getByRole('status')).toContainText(/te escucho|hablar/i);
    await page.keyboard.press('Escape');
    await expect(bar).toHaveCount(0);
  });

  test('ayuda guiada: el aviso «Logi te ayuda» y el formulario siguen siendo accesibles', async ({ browser }) => {
    test.setTimeout(240000);
    const ctx = await browser.newContext({ locale: 'es-BO', viewport: { width: 1366, height: 800 } });
    await ctx.addInitScript(installFakeVoice);
    const page = await ctx.newPage();
    await login(page, 'admin');
    await page.goto('/dashboard');
    await page.getByRole('button', { name: /abrir asistente/i }).click();
    await page.getByRole('button', { name: /abrir el chat de voz/i }).click();
    await hear(page, 'ayúdame a crear un paquete');
    await expect(page.getByRole('button', { name: 'Terminar' })).toBeVisible({ timeout: 60000 });
    // el aviso de «Logi te ayuda» tiene un botón con nombre; NO hay capa que bloquee la pantalla
    expect(await page.locator('[data-logi-run]').count()).toBe(0);
    await expect.poll(() => page.evaluate(() => window.__spoken.at(-1) ?? ''), { timeout: 60000 }).toMatch(/de dónde sale/i);
    const select = page.locator('select[name="origen"]');
    await expect(select).toBeVisible();
    // el campo que Logi señala sigue siendo un control normal con su etiqueta
    await expect(select).toHaveAccessibleName(/origen/i);
    // la persona puede cambiar el campo con el teclado mientras Logi ayuda
    await select.focus();
    await select.selectOption({ index: 1 });
    expect(await select.inputValue()).not.toBe('');
    await page.getByRole('button', { name: 'Terminar' }).click();
    await expect(page.getByRole('button', { name: 'Terminar' })).toHaveCount(0);
  });
});
