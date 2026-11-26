import { test, expect, request as pwRequest } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { login, openScreen, closeLeakedContexts } from './helpers.js';

test.afterEach(closeLeakedContexts);

/**
 * Avisos con la pestaña cerrada (Web Push), contra el backend y la base REALES. No se puede probar la entrega de una notificación (la
 * envía el servicio de notificaciones del navegador, fuera de nuestro control), así que se verifica lo que SÍ es nuestro: la API de
 * suscripción (autenticación, validación y seguridad), que el servidor responda bien tanto con la tabla creada como sin ella (migración
 * 023), y que la pantalla solo ofrezca la opción cuando el servidor puede cumplirla.
 */
const API = process.env.E2E_API_URL || 'http://localhost:3000/api';
const H = { 'X-Requested-With': 'XMLHttpRequest' };
const GOOD = 'https://fcm.googleapis.com/fcm/send/e2e-prueba-no-real';
const KEYS = { p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM', auth: 'tBHItJI5svbpez7KI4CCXg' };

const sessionCtx = async (browser, role) => {
  const ctx = await browser.newContext();
  await ctx.addCookies(JSON.parse(readFileSync(`.e2e-auth/${role}.json`, 'utf8')).cookies);
  return ctx;
};

test('sin sesión, las tres rutas rechazan (401)', async () => {
  const anon = await pwRequest.newContext();
  for (const [method, path, data] of [['GET', '/notifications/config'], ['POST', '/notifications/subscribe', { endpoint: GOOD, keys: KEYS }], ['POST', '/notifications/unsubscribe', { endpoint: GOOD }]]) {
    const res = await anon.fetch(`${API}${path}`, { method, headers: H, data });
    expect(res.status(), `${method} ${path}`).toBe(401);
  }
  await anon.dispose();
});

test('la configuración la puede pedir cualquier rol y dice si la función está disponible (y por qué no)', async ({ browser }) => {
  for (const role of ['admin', 'operator', 'driver', 'client']) {
    const ctx = await sessionCtx(browser, role);
    const res = await ctx.request.get(`${API}/notifications/config`, { headers: H });
    expect(res.status(), role).toBe(200);
    const { data } = await res.json();
    expect(typeof data.enabled, role).toBe('boolean');
    if (data.enabled) expect(data.publicKey).toMatch(/^[A-Za-z0-9_-]{80,100}$/);
    else expect(['sin_claves', 'sin_tabla']).toContain(data.reason);
    expect(JSON.stringify(data)).not.toMatch(/priv|secret|VAPID_PRIVATE/i); // la clave privada nunca sale
  }
});

test('el servidor rechaza direcciones de destino peligrosas ANTES de tocar la base (no se puede usar para llamar a otros)', async ({ browser }) => {
  const ctx = await sessionCtx(browser, 'client');
  const evil = [
    'http://169.254.169.254/latest/meta-data/', 'http://localhost:3000/api/iam/login', 'https://127.0.0.1/x', 'https://metadata.google.internal/x',
    'https://sitio-ajeno.example/x', 'https://fcm.googleapis.com.sitio-ajeno.example/x', 'https://user:pass@fcm.googleapis.com/x', 'ftp://fcm.googleapis.com/x',
  ];
  for (const endpoint of evil) {
    const res = await ctx.request.post(`${API}/notifications/subscribe`, { headers: H, data: { endpoint, keys: KEYS } });
    expect(res.status(), endpoint).toBe(400);
    expect(await res.text(), endpoint).not.toMatch(/zod|postgres|relation|stack/i);
  }
  for (const body of [{}, { endpoint: GOOD }, { endpoint: GOOD, keys: { p256dh: 'x', auth: 'y' } }, { endpoint: ['x'], keys: KEYS }, 'texto']) {
    const res = await ctx.request.post(`${API}/notifications/subscribe`, { headers: { ...H, 'Content-Type': 'application/json' }, data: typeof body === 'string' ? JSON.stringify(body) : body });
    expect([400]).toContain(res.status());
  }
});

test('suscribirse y cancelar: con la tabla creada funciona (y deja todo limpio); sin ella responde 503 sin detalles', async ({ browser }) => {
  const ctx = await sessionCtx(browser, 'client');
  const cfg = (await (await ctx.request.get(`${API}/notifications/config`, { headers: H })).json()).data;
  const sub = await ctx.request.post(`${API}/notifications/subscribe`, { headers: H, data: { endpoint: GOOD, keys: KEYS } });
  if (cfg.enabled) {
    expect(sub.status()).toBe(201);
    const un = await ctx.request.post(`${API}/notifications/unsubscribe`, { headers: H, data: { endpoint: GOOD } });
    expect(un.status()).toBe(204);
  } else {
    expect(sub.status()).toBe(503);
    const text = await sub.text();
    expect(text).toMatch(/no están disponibles/);
    expect(text).not.toMatch(/relation|42P01|push_subscriptions|PGRST/);
  }
  test.info().annotations.push({ type: 'estado', description: cfg.enabled ? 'tabla creada: se probó el ciclo completo' : `función apagada (${cfg.reason}): solo se probó la respuesta «no disponible»` });
});

test('la pantalla solo ofrece «Con la pestaña cerrada» cuando el servidor puede cumplirla', async ({ browser }) => {
  test.setTimeout(180_000);
  const ctx = await sessionCtx(browser, 'admin');
  const cfg = (await (await ctx.request.get(`${API}/notifications/config`, { headers: H })).json()).data;
  const page = await ctx.newPage();
  await login(page, 'admin');
  await openScreen(page, '/dashboard', (p) => p.getByRole('button', { name: /abrir asistente/i }));
  await page.getByRole('button', { name: /abrir asistente/i }).click();
  await expect(page.getByRole('button', { name: /avisos de logi/i })).toBeVisible({ timeout: 30_000 });
  const toggle = page.getByRole('button', { name: /con la pestaña cerrada/i });
  // con el servidor de desarrollo no hay service worker, así que aunque el servidor lo ofrezca el navegador de prueba no suscribe: lo que
  // importa es que NUNCA se muestre una opción que el servidor no puede cumplir
  if (!cfg.enabled) await expect(toggle).toHaveCount(0);
  await page.screenshot({ path: 'e2e-results/avisos-pestana-cerrada.png' });
});

test('«Enviar prueba»: sin sesión 401, sin suscripción 404 con su mensaje, y con una suscripción falsa el servidor intenta de verdad con Google y la limpia', async ({ browser }) => {
  const anon = await pwRequest.newContext();
  expect((await anon.post(`${API}/notifications/test`, { headers: H })).status()).toBe(401);
  await anon.dispose();

  const ctx = await sessionCtx(browser, 'client');
  const cfg = (await (await ctx.request.get(`${API}/notifications/config`, { headers: H })).json()).data;
  test.skip(!cfg.enabled, 'la función de avisos está apagada en este servidor');

  const none = await ctx.request.post(`${API}/notifications/test`, { headers: H });
  expect(none.status()).toBe(404);
  expect((await none.json()).message).toMatch(/Primero activa los avisos/);

  // una suscripción con claves bien formadas pero que Google no conoce: el servidor la intenta enviar de verdad
  const crypto = await import('node:crypto');
  const ecdh = crypto.createECDH('prime256v1'); ecdh.generateKeys();
  const fake = { endpoint: 'https://fcm.googleapis.com/fcm/send/e2e-prueba-inexistente', keys: { p256dh: ecdh.getPublicKey().toString('base64url'), auth: crypto.randomBytes(16).toString('base64url') } };
  expect((await ctx.request.post(`${API}/notifications/subscribe`, { headers: H, data: fake })).status()).toBe(201);
  const res = await ctx.request.post(`${API}/notifications/test`, { headers: H });
  expect(res.status(), await res.text()).toBe(502); // Google la rechaza: no hay a quién entregar
  expect(await res.text()).not.toMatch(/fcm|endpoint|statusCode|stack/i);
  // y nunca queda basura: si Google dijo 404/410 se borró sola; si no, se cancela aquí
  await ctx.request.post(`${API}/notifications/unsubscribe`, { headers: H, data: { endpoint: fake.endpoint } });
  const again = await ctx.request.post(`${API}/notifications/test`, { headers: H });
  expect(again.status()).toBe(404);
});
