import { test, expect } from '@playwright/test';
import { login } from './helpers.js';

/**
 * Chat de voz y conversación, con el backend, Supabase y Gemini reales.
 * Playwright no tiene micrófono ni altavoz: se inyecta un reconocimiento de voz simulado que "dice" las frases
 * (window.__rec) y una síntesis simulada que registra lo que el asistente diría en voz alta (window.__spoken).
 * Lo que NO se puede probar aquí: la calidad real del reconocimiento ni de la voz del navegador.
 */
const API = process.env.E2E_API_URL || 'http://localhost:3000/api';
const H = { 'X-Requested-With': 'XMLHttpRequest' };

const FAKE_SPEECH = () => {
  class FakeRecognition {
    constructor() { window.__rec = this; this.started = false; }
    start() { this.started = true; }
    stop() { this.finish(); }
    abort() { this.finish(); }
    finish() { if (!this.started) return; this.started = false; if (this.onend) this.onend(); }
    say(text) { if (this.onresult) this.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: text }], { isFinal: true })] }); }
  }
  // Chrome ya trae un SpeechRecognition nativo que tendría prioridad: se reemplazan los dos nombres
  window.SpeechRecognition = FakeRecognition;
  window.webkitSpeechRecognition = FakeRecognition;
  window.__spoken = [];
  // speechSynthesis es de solo lectura en Chrome: asignar se ignora en silencio, hay que redefinir la propiedad
  const define = (name, value) => Object.defineProperty(window, name, { value, configurable: true, writable: true });
  define('SpeechSynthesisUtterance', class { constructor(text) { this.text = text; } });
  define('speechSynthesis', {
    speak(u) { window.__spoken.push(u.text); setTimeout(() => { if (u.onend) u.onend(); }, 10); },
    cancel() {}, getVoices() { return [{ lang: 'es-MX', name: 'Simulada' }]; }, addEventListener() {}, removeEventListener() {},
  });
};

const enableAiMode = async (page) => {
  await page.goto('/');
  const toggle = page.getByRole('switch', { name: /modo ia/i });
  await expect(toggle).toBeVisible({ timeout: 20_000 });
  if ((await toggle.getAttribute('aria-checked')) !== 'true') await toggle.click();
  await expect(page.getByRole('heading', { name: /hola, /i })).toBeVisible({ timeout: 20_000 });
};

/** El usuario "dice" una frase en el chat de voz y se espera a que el asistente termine de responder en voz alta. */
const sayAndWait = async (page, phrase) => {
  const before = await page.evaluate(() => window.__spoken.length);
  await page.waitForFunction(() => window.__rec && window.__rec.started, null, { timeout: 15_000 });
  await page.evaluate((t) => { window.__rec.say(t); window.__rec.finish(); }, phrase);
  await page.waitForFunction((n) => window.__spoken.length > n, before, { timeout: 120_000 });
  return page.evaluate((n) => window.__spoken.slice(n).join(' '), before);
};

test.describe.configure({ mode: 'serial' });

test('1. el administrador habla: pregunta por viajes con espacio y recibe una respuesta corta, hablada y con tarjeta', async ({ page }) => {
  await page.addInitScript(FAKE_SPEECH);
  await login(page, 'admin');
  await enableAiMode(page);
  await page.getByRole('button', { name: /abrir el chat de voz/i }).click();
  await expect(page.getByRole('dialog', { name: /chat de voz/i })).toBeVisible();
  await expect(page.getByTestId('voice-phase')).toContainText(/te escucho/i);

  const spoken = await sayAndWait(page, '¿Qué viajes a La Paz hay el viernes de tres a cinco de la tarde?');
  expect(spoken.length, 'la respuesta debe ser corta para escucharla').toBeLessThan(600);
  expect(spoken, 'sin markdown ni símbolos').not.toMatch(/[*#`|]/);
  expect(spoken).toMatch(/viaje|La Paz|viernes|sábado|jueves|no hay|disponible/i);
  await page.screenshot({ path: 'e2e-results/shots/voz_1_respuesta.png', fullPage: true });

  // manos libres: vuelve a escuchar solo cuando termina de hablar
  await page.waitForFunction(() => window.__rec && window.__rec.started, null, { timeout: 15_000 });

  // al cerrar, lo hablado queda escrito y con su tarjeta de disponibilidad
  await page.getByRole('button', { name: /salir del chat de voz/i }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('¿Qué viajes a La Paz hay el viernes de tres a cinco de la tarde?')).toBeVisible();
  await expect(page.getByText(/viajes disponibles a la paz/i)).toBeVisible();
  await page.screenshot({ path: 'e2e-results/shots/voz_2_tarjeta_disponibilidad.png', fullPage: true });
});

test('2. varias peticiones en una sola frase se resuelven juntas (operación + camiones libres)', async ({ page }) => {
  await page.addInitScript(FAKE_SPEECH);
  await login(page, 'admin');
  await enableAiMode(page);
  await page.getByRole('button', { name: /abrir el chat de voz/i }).click();
  const spoken = await sayAndWait(page, '¿Cómo va la operación hoy y qué camiones están libres el viernes de tres a cinco?');
  expect(spoken.length).toBeLessThan(700);
  await page.getByRole('button', { name: /salir del chat de voz/i }).click();
  await expect(page.getByText(/^(Operación de hoy|Resumen del día)$/).first()).toBeVisible({ timeout: 60_000 });   // respondió la primera parte
  await expect(page.getByText(/flota en ese horario/i)).toBeVisible({ timeout: 60_000 });               // y la segunda
  await page.screenshot({ path: 'e2e-results/shots/voz_3_varias_peticiones.png', fullPage: true });
});

test('3. la conversación recuerda el contexto y no se pierde al cambiar de pantalla', async ({ page }) => {
  await page.addInitScript(FAKE_SPEECH);
  await login(page, 'admin');
  await enableAiMode(page);
  await page.getByLabel(/mensaje para el asistente/i).fill('¿Qué viajes a La Paz hay el viernes?');
  await page.getByRole('button', { name: /^enviar$/i }).click();
  await expect(page.locator('p:not(.sr-only)').filter({ hasText: /consultando…/i })).toBeHidden({ timeout: 120_000 });
  await expect(page.locator('[data-role="assistant"]')).toHaveCount(1);

  // otra pregunta que solo se entiende por el contexto ("ese día")
  await page.getByLabel(/mensaje para el asistente/i).fill('¿Y ese mismo día hay algo a Oruro?');
  await page.getByRole('button', { name: /^enviar$/i }).click();
  await expect(page.locator('[data-role="assistant"]')).toHaveCount(2, { timeout: 120_000 });
  const answer = await page.locator('[data-role="assistant"]').last().innerText();
  expect(answer, 'debía entender "ese día" por la conversación, sin volver a preguntar la fecha').not.toMatch(/qué día|cuál día|qué fecha|indícame la fecha/i);

  // cambia de pantalla y vuelve: la conversación sigue ahí (menú lateral, sin recargar la página)
  await page.getByRole('link', { name: /^paquetes/i }).first().click();
  await page.waitForURL(/\/logistics\/packages/);
  await page.getByRole('link', { name: /^asistente/i }).first().click();
  await expect(page.getByText('¿Qué viajes a La Paz hay el viernes?')).toBeVisible();
  await expect(page.getByText('¿Y ese mismo día hay algo a Oruro?')).toBeVisible();
});

test('4. por voz se puede PEDIR una acción, pero no confirmarla: sigue haciendo falta el clic', async ({ browser }) => {
  const ctx = await browser.newContext({ locale: 'es-BO' });
  const page = await ctx.newPage();
  await page.addInitScript(FAKE_SPEECH);
  await login(page, 'admin');
  await enableAiMode(page);
  await page.getByRole('button', { name: /abrir el chat de voz/i }).click();

  const TAG = `E2E-${Date.now()}`;
  const spoken = await sayAndWait(page, `Crea un paquete de La Paz a Oruro de dos kilos para el destinatario ${TAG} Voz`);
  expect(spoken).toMatch(/confirm|tarjeta|prepar/i);
  await expect(page.locator('p:not(.sr-only)').filter({ hasText: /acción esperando tu confirmación/i })).toBeVisible();
  // decir "confirmo" no ejecuta nada: la confirmación es el botón de la tarjeta
  await sayAndWait(page, 'Sí, confírmalo').catch(() => {});

  const res = await ctx.request.get(`${API}/logistics/packages`, { headers: H });
  const body = await res.json();
  const list = Array.isArray(body) ? body : body.data;
  expect(list.filter((p) => (p.recipient_name || '').startsWith(TAG)), 'por voz no se creó nada').toHaveLength(0);

  await page.getByRole('button', { name: /salir del chat de voz/i }).click();
  await expect(page.getByRole('button', { name: /^confirmar$/i }).first()).toBeVisible(); // la tarjeta espera el clic
  await ctx.close();
});

test('5. un cliente consulta viajes disponibles pero no puede agendar', async ({ page }) => {
  await page.addInitScript(FAKE_SPEECH);
  await login(page, 'client');
  await enableAiMode(page);
  await page.getByLabel(/mensaje para el asistente/i).fill('¿Qué viajes a La Paz hay el sábado por la mañana?');
  await page.getByRole('button', { name: /^enviar$/i }).click();
  await expect(page.locator('p:not(.sr-only)').filter({ hasText: /consultando…/i })).toBeHidden({ timeout: 120_000 });
  await expect(page.getByText(/viajes disponibles/i).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /agendar un paquete aquí/i })).toHaveCount(0);
});
