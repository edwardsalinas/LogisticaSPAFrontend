import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { login, closeLeakedContexts } from './helpers.js';

test.afterEach(closeLeakedContexts);

/**
 * Memoria de uso, con el backend, la base y la aplicación reales (micrófono y altavoces simulados). Se siembra un paquete con un
 * destinatario con teléfono; luego, al registrar otro por voz, el micrófono «oye mal» el apellido («Tarkino» por «Tarquino») y Logi:
 *  - pregunta «¿Te refieres a Zulema Tarquino?»;
 *  - con el «sí» usa el nombre correcto y NO vuelve a preguntar el teléfono (lo escribe y lo deja en el resumen);
 *  - al remitente, que se dice igual que el guardado, lo reconoce sin preguntar.
 * El nombre sembrado NO lleva la marca E2E- a propósito: los nombres de prueba se excluyen de los contactos. Se borra por id
 * (e2e-results/created-voz-contactos.json, ver e2e-cleanup); la marca E2E-<sello> va en el contenido.
 */
const TAG = `E2E-${Date.now()}`;
const created = { tag: TAG, routeIds: [], packageIds: [] };
const API = process.env.E2E_API_URL || 'http://localhost:3000/api';
const H = { 'X-Requested-With': 'XMLHttpRequest' };
const save = () => writeFileSync('e2e-results/created-voz-contactos.json', JSON.stringify(created, null, 2));
const state = {};

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

const userSays = async (page, text) => {
  await page.waitForFunction(() => window.__sr.last && window.__sr.last.started, null, { timeout: 90_000 });
  await page.evaluate((t) => {
    const rec = window.__sr.last;
    rec.onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript: t }], { isFinal: true })] });
    rec.finish();
  }, text);
};
const lastSpoken = (page) => page.evaluate(() => window.__spoken.at(-1) ?? '');
const allSpoken = (page) => page.evaluate(() => window.__spoken);

const sessionCtx = async (browser, role, extra = {}) => {
  const ctx = await browser.newContext(extra);
  await ctx.addCookies(JSON.parse(readFileSync(`.e2e-auth/${role}.json`, 'utf8')).cookies);
  return ctx;
};

test('0. se siembra un paquete con un destinatario conocido (con teléfono)', async ({ browser }) => {
  const ctx = await sessionCtx(browser, 'admin');
  const res = await ctx.request.post(`${API}/logistics/packages`, {
    headers: H,
    data: { description: TAG, origen: 'Oruro', destino: 'La Paz', peso: 1, sender_name: 'Wilmer Chambilla', recipient_name: 'Zulema Tarquino', recipient_phone: '71234567' },
  });
  expect(res.status(), await res.text()).toBe(201);
  const p = (await res.json()).data;
  created.packageIds.push(p.id); save();
  state.seeded = true;
});

test('1. el servidor devuelve los contactos al personal y NO al cliente ni al conductor', async ({ browser }) => {
  test.skip(!state.seeded, 'depende del paso 0');
  const staff = await sessionCtx(browser, 'admin');
  const got = await (await staff.request.get(`${API}/ai-agent/contacts`, { headers: H })).json();
  const mine = got.data.recipients.find((c) => c.name === 'Zulema Tarquino');
  expect(mine, JSON.stringify(got.data.recipients.slice(0, 3))).toBeTruthy();
  expect(mine.phone).toBe('71234567');
  expect(got.data.senders.some((c) => c.name === 'Wilmer Chambilla')).toBe(true);

  for (const role of ['client', 'driver']) {
    const ctx = await sessionCtx(browser, role);
    const res = await ctx.request.get(`${API}/ai-agent/contacts`, { headers: H });
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text, role).not.toContain('Zulema Tarquino');
    expect(text, role).not.toContain('71234567');
  }
});

test('2. por voz: oye «Tarkino», pregunta «¿Te refieres a Zulema Tarquino?» y con el «sí» no vuelve a pedir el teléfono', async ({ browser }) => {
  test.skip(!state.seeded, 'depende del paso 0');
  test.setTimeout(300_000);
  const ctx = await sessionCtx(browser, 'admin', { locale: 'es-BO', viewport: { width: 1366, height: 800 } });
  await ctx.addInitScript(installFakeVoice);
  const page = await ctx.newPage();
  await login(page, 'admin');

  const rr = await ctx.request.get(`${API}/logistics/routes`, { headers: H });
  const routes = ((await rr.json()).data ?? []).filter((r) => r.origin && r.destination);
  expect(routes.length).toBeGreaterThan(0);
  const { origin, destination } = routes[0];

  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /abrir asistente/i }).click();
  await page.getByRole('button', { name: /abrir el chat de voz/i }).click();
  await userSays(page, 'ayúdame a crear un paquete');
  await expect(page).toHaveURL(/\/logistics\/packages/, { timeout: 30_000 });
  await expect.poll(() => lastSpoken(page), { timeout: 60_000 }).toMatch(/de dónde sale/i);
  await userSays(page, origin);
  await expect.poll(() => lastSpoken(page), { timeout: 30_000 }).toMatch(/a dónde va/i);
  await userSays(page, destination);
  await expect.poll(() => lastSpoken(page), { timeout: 30_000 }).toMatch(/quién lo envía/i);

  // el remitente se dice igual que el guardado: se reconoce SIN preguntar
  await userSays(page, 'wilmer chambilla');
  await expect.poll(() => lastSpoken(page), { timeout: 30_000 }).toMatch(/cuántos kilos/i);
  expect((await allSpoken(page)).some((t) => /¿Te refieres a Wilmer/.test(t))).toBe(false);
  await userSays(page, 'dos');
  await expect.poll(() => lastSpoken(page), { timeout: 30_000 }).toMatch(/a nombre de quién/i);

  // el micrófono oyó mal el apellido: Logi propone al contacto conocido
  await userSays(page, 'sulema tarkino');
  await expect.poll(() => lastSpoken(page), { timeout: 30_000 }).toMatch(/¿Te refieres a Zulema Tarquino\?/);
  await page.screenshot({ path: 'e2e-results/voz-contactos-1-pregunta.png' });
  await userSays(page, 'sí');

  // no pide el teléfono: ya lo tiene, lo escribe a la vista y avisa
  await expect.poll(async () => (await allSpoken(page)).some((t) => /ya tengo su teléfono guardado.*4 5 6 7/i.test(t)), { timeout: 30_000 }).toBe(true);
  await expect(page.locator('input[name="recipient_name"]')).toHaveValue('Zulema Tarquino');
  await expect(page.locator('input[name="recipient_phone"]')).toHaveValue('71234567');
  await expect.poll(() => lastSpoken(page), { timeout: 30_000 }).toMatch(/qué contiene/i);
  expect((await allSpoken(page)).some((t) => /tiene teléfono\?/i.test(t))).toBe(false);
  await userSays(page, TAG);
  await expect.poll(() => lastSpoken(page), { timeout: 30_000 }).toMatch(/¿Lo registro\?/);
  const summary = await lastSpoken(page);
  expect(summary).toContain('Zulema Tarquino');
  expect(summary).toContain('71234567'); // el teléfono guardado queda en el resumen que la persona confirma
  await page.screenshot({ path: 'e2e-results/voz-contactos-2-resumen.png' });

  // no se registra otro paquete: «no»
  await userSays(page, 'no');
  await expect.poll(() => lastSpoken(page), { timeout: 30_000 }).toMatch(/no lo registro/i);
  const list = await (await ctx.request.get(`${API}/logistics/packages`, { headers: H })).json();
  const rows = (Array.isArray(list) ? list : list.data).filter((p) => p.description === TAG);
  expect(rows).toHaveLength(1); // solo el sembrado
});
