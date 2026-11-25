import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { login } from './helpers.js';

/**
 * Fase 3: confirmar por VOZ («sí, hazlo» / «cancela») en el chat de voz con manos libres, con el backend, Supabase y Gemini
 * reales. El micrófono y los altavoces se simulan (el navegador de pruebas no tiene): la prueba «dice» las frases y recoge lo
 * que se le pide leer en voz alta. Se comprueba, en la API, que:
 *  - «cancela» no crea nada;
 *  - «sí, hazlo» cierra el chat de voz, Logi lo hace en pantalla (hablando) y se crea UN solo paquete.
 * Los datos creados llevan la marca E2E-<sello> (ids en e2e-results/created-voz.json, ver e2e-cleanup).
 */
const STAMP = Date.now();
const TAG = `E2E-${STAMP}`;
const created = { tag: TAG, routeIds: [], packageIds: [] };
const API = process.env.E2E_API_URL || 'http://localhost:3000/api';
const H = { 'X-Requested-With': 'XMLHttpRequest' };
const save = () => writeFileSync('e2e-results/created-voz.json', JSON.stringify(created, null, 2));

const myPackages = async (ctx) => {
  const res = await ctx.request.get(`${API}/logistics/packages`, { headers: H });
  expect(res.status()).toBe(200);
  const body = await res.json();
  return (Array.isArray(body) ? body : body.data).filter((p) => (p.recipient_name || '').startsWith(TAG));
};

// micrófono y altavoces simulados
const installFakeVoice = () => {
  window.__spoken = [];
  window.__sr = { last: null, count: 0 };
  class FakeSR {
    constructor() { this.started = false; window.__sr.last = this; window.__sr.count += 1; }
    start() { this.started = true; }
    stop() { this.finish(); }
    abort() { this.finish(); }
    say(text) { this.onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript: text }], { isFinal: true })] }); }
    finish() { if (!this.started) return; this.started = false; this.onend?.(); }
  }
  window.webkitSpeechRecognition = FakeSR;
  window.SpeechRecognition = FakeSR; // Chrome también trae la versión sin prefijo: se reemplazan las dos
  window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
  // en Chrome speechSynthesis es de solo lectura: hay que redefinirla
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: {
      speaking: false,
      speak(u) { window.__spoken.push(u.text); setTimeout(() => u.onend && u.onend(), 30); },
      cancel() {}, getVoices() { return [{ lang: 'es-ES', name: 'es' }]; }, addEventListener() {}, removeEventListener() {},
    },
  });
};

// el resumen de la propuesta tal como se muestra DENTRO del chat de voz (la tarjeta del chat de texto también lo repite)
// el chat de voz del panel normal es la barra compacta (no un diálogo modal); en el Modo IA y en la pantalla del asistente sigue siendo completo
const voiceBar = (page) => page.getByTestId('voice-compact');
const voiceProposal = (page) => voiceBar(page).getByText('Registrar un paquete nuevo', { exact: true });

/** El usuario dice una frase (espera a que haya una escucha en marcha). */
const userSays = async (page, text) => {
  await page.waitForFunction(() => window.__sr.last && window.__sr.last.started, null, { timeout: 90_000 });
  await page.evaluate((t) => { window.__sr.last.say(t); window.__sr.last.finish(); }, text);
};

test('confirmar por voz: «cancela» no hace nada y «sí, hazlo» lo hace Logi a la vista de todos', async ({ browser }) => {
  test.setTimeout(300_000);
  const ctx = await browser.newContext({ locale: 'es-BO', viewport: { width: 1366, height: 800 } });
  await ctx.addInitScript(installFakeVoice);
  const page = await ctx.newPage();
  await login(page, 'admin');
  await page.goto('/dashboard');
  await page.getByRole('button', { name: /abrir asistente/i }).click();
  await page.getByRole('button', { name: /abrir el chat de voz/i }).click();
  await expect(voiceBar(page)).toBeVisible();

  const request = `Crea un paquete de La Paz a Oruro de 3 kilos para el destinatario "${TAG} Destinatario" con la descripción ${TAG}`;

  // 1) «cancela»: Logi lee el resumen y pregunta; al decir «cancela» no se crea nada
  await userSays(page, request);
  await expect(voiceProposal(page)).toBeVisible({ timeout: 120_000 });
  await expect.poll(() => page.evaluate(() => window.__spoken.join(' | ')), { timeout: 20_000 }).toMatch(/¿Lo hago\?/);
  expect(await page.evaluate(() => window.__spoken.join(' | '))).toContain('La Paz a Oruro'); // lee el resumen del servidor
  expect(await myPackages(ctx), 'antes del «sí» no se crea nada').toHaveLength(0);
  await userSays(page, 'cancela');
  await expect(voiceProposal(page)).toHaveCount(0, { timeout: 15_000 });
  await expect.poll(() => page.evaluate(() => window.__spoken.join(' | ')), { timeout: 15_000 }).toMatch(/no hice ningún cambio/i);
  expect(await myPackages(ctx), '«cancela»: no se crea nada').toHaveLength(0);

  // 2) «sí, hazlo»: se cierra el chat de voz, Logi trabaja (y habla) y se crea un solo paquete
  await page.waitForTimeout(61_000); // límite de consultas del chat: 1 minuto
  const spokenBefore = await page.evaluate(() => window.__spoken.length);
  await userSays(page, request);
  await expect(voiceProposal(page)).toBeVisible({ timeout: 120_000 });
  await userSays(page, 'Sí, hazlo');

  await expect(voiceBar(page)).toHaveCount(0, { timeout: 15_000 }); // la pantalla queda libre
  await expect(page.locator('[data-logi-run]')).toHaveCount(1, { timeout: 15_000 });
  await expect(page.locator('[data-logi-run]')).toHaveCount(0, { timeout: 120_000 });
  await expect(page).toHaveURL(/\/logistics\/packages$/);

  const made = await myPackages(ctx);
  expect(made, 'debe haberse creado exactamente un paquete').toHaveLength(1);
  created.packageIds.push(made[0].id);
  save();
  expect(made[0]).toMatchObject({ origen: 'La Paz', destino: 'Oruro' });
  // Logi habló en voz alta durante la ejecución (aunque la lectura de respuestas esté apagada)
  const spokenAfter = (await page.evaluate((n) => window.__spoken.slice(n), spokenBefore)).join(' | ');
  expect(spokenAfter).toMatch(/Voy a registrar un paquete/);
  expect(spokenAfter).toMatch(/¡Listo!/);
  await ctx.close();
});
