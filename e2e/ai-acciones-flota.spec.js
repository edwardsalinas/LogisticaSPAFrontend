import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { closeLeakedContexts } from './helpers.js';

test.afterEach(closeLeakedContexts);

/**
 * Anular un paquete, crear un viaje y asignarle conductor, con el modelo de IA, el backend y la base reales (por la API del chat).
 * El asistente SOLO propone: se comprueba que antes de confirmar la base no cambió, que al confirmar sí, y que cliente y conductor
 * no pueden proponer ninguna de las tres. Los datos creados se borran por id (e2e-results/created-acciones-flota.json, ver e2e-cleanup);
 * el paquete lleva la marca E2E-<sello> y el viaje una hora poco común (03:17) para poder identificarlo.
 */
const TAG = `E2E-${Date.now()}`;
const created = { tag: TAG, routeIds: [], packageIds: [] };
const API = process.env.E2E_API_URL || 'http://localhost:3000/api';
const H = { 'X-Requested-With': 'XMLHttpRequest' };
const save = () => writeFileSync('e2e-results/created-acciones-flota.json', JSON.stringify(created, null, 2));
const state = {};

// mañana en Bolivia (UTC-4) a las 03:17 → 07:17 UTC
const tomorrow = new Date(Date.now() - 4 * 3600 * 1000 + 24 * 3600 * 1000).toISOString().slice(0, 10);
const DEPARTURE_ISO = `${tomorrow}T07:17:00.000Z`;

const sessionCtx = async (browser, role) => {
  const ctx = await browser.newContext();
  await ctx.addCookies(JSON.parse(readFileSync(`.e2e-auth/${role}.json`, 'utf8')).cookies);
  return ctx;
};

/** Pregunta al asistente y devuelve { response, proposals } (las tarjetas de acción que preparó). */
const ask = async (ctx, message) => {
  const res = await ctx.request.post(`${API}/ai-agent/chat`, { headers: H, data: { message }, timeout: 120_000 });
  expect(res.status(), await res.text()).toBe(200);
  const body = await res.json();
  const proposals = (body.attachments ?? []).filter((a) => a.kind === 'action_proposal').map((a) => a.action);
  return { response: body.response, proposals };
};
const confirm = async (ctx, id) => {
  const res = await ctx.request.post(`${API}/ai-agent/actions/${id}/confirm`, { headers: H });
  expect(res.status(), await res.text()).toBe(200);
  return (await res.json()).result;
};
const packages = async (ctx) => { const b = await (await ctx.request.get(`${API}/logistics/packages`, { headers: H })).json(); return Array.isArray(b) ? b : b.data; };
const routes = async (ctx) => { const b = await (await ctx.request.get(`${API}/logistics/routes`, { headers: H })).json(); return Array.isArray(b) ? b : b.data; };

test('0. se crea un paquete pendiente para anularlo', async ({ browser }) => {
  const ctx = await sessionCtx(browser, 'admin');
  const res = await ctx.request.post(`${API}/logistics/packages`, { headers: H, data: { description: TAG, origen: 'Oruro', destino: 'La Paz', peso: 1, recipient_name: `${TAG} Destinatario`, sender_name: `${TAG} Remitente` } });
  expect(res.status(), await res.text()).toBe(201);
  const p = (await res.json()).data;
  created.packageIds.push(p.id); save();
  state.code = p.tracking_code; state.pkgId = p.id;
});

test('1. «anula el paquete»: propone, no cambia nada hasta confirmar, y al confirmar queda cancelado', async ({ browser }) => {
  test.skip(!state.code, 'depende del paso 0');
  test.setTimeout(180_000);
  const ctx = await sessionCtx(browser, 'admin');
  const { proposals, response } = await ask(ctx, `Anula el paquete ${state.code}, lo registré por error.`);
  const p = proposals.find((x) => x.type === 'cancel_package');
  expect(p, `no preparó la propuesta: ${response.slice(0, 200)}`).toBeTruthy();
  expect(p.lines.join(' ')).toContain(state.code);
  expect((await packages(ctx)).find((x) => x.id === state.pkgId).status).toBe('pendiente'); // proponer no cambia nada
  const result = await confirm(ctx, p.id);
  expect(result.message).toMatch(/anulado/i);
  expect((await packages(ctx)).find((x) => x.id === state.pkgId).status).toBe('cancelado');
});

test('2. «crea un viaje»: propone con la hora de Bolivia y, al confirmar, el viaje existe con esa salida', async ({ browser }) => {
  test.setTimeout(180_000);
  const ctx = await sessionCtx(browser, 'admin');
  const { proposals, response } = await ask(ctx, `Crea un viaje de Oruro a La Paz para el ${tomorrow} a las 03:17 de la madrugada, hora de Bolivia. No le pongas conductor.`);
  const p = proposals.find((x) => x.type === 'create_trip');
  expect(p, `no preparó la propuesta: ${response.slice(0, 200)}`).toBeTruthy();
  expect(p.lines).toContain('Trayecto: Oruro → La Paz');
  expect(p.lines.join(' ')).toMatch(/3:17|03:17/);
  const before = (await routes(ctx)).filter((r) => r.departure_time && Date.parse(r.departure_time) === Date.parse(DEPARTURE_ISO));
  expect(before).toHaveLength(0); // proponer no crea nada
  await confirm(ctx, p.id);
  const after = (await routes(ctx)).filter((r) => Date.parse(r.departure_time) === Date.parse(DEPARTURE_ISO) && r.origin === 'Oruro');
  expect(after).toHaveLength(1);
  created.routeIds.push(after[0].id); save();
  state.routeId = after[0].id;
  state.routeCode = after[0].route_code;
});

test('3. «asigna al conductor»: propone con el viaje y el conductor y, al confirmar, el viaje lo tiene', async ({ browser }) => {
  test.skip(!state.routeId, 'depende del paso 2');
  test.setTimeout(240_000);
  const ctx = await sessionCtx(browser, 'admin');
  const allRoutes = await routes(ctx);
  const busy = new Set(allRoutes.filter((r) => r.status === 'en_transito').map((r) => r.driver_id));
  const dres = await (await ctx.request.get(`${API}/fleet/drivers`, { headers: H })).json();
  const list = (Array.isArray(dres) ? dres : dres.data).filter((d) => d.full_name && !busy.has(d.id));
  // un nombre que identifique a UN solo conductor
  const driver = list.find((d) => list.filter((x) => x.full_name.toLowerCase().includes(d.full_name.toLowerCase())).length === 1);
  if (!driver) {
    // Sin un conductor libre no se puede probar el camino feliz, pero sí lo que el servidor debe negar: asignar a quien va en tránsito.
    const all = (Array.isArray(dres) ? dres : dres.data).filter((d) => d.full_name && busy.has(d.id));
    test.skip(!all.length, 'no hay conductores');
    const { proposals: none } = await ask(ctx, `Asigna al conductor ${all[0].full_name} al viaje de Oruro a La Paz del ${tomorrow} a las 03:17 (hora de Bolivia).`);
    expect(none.filter((x) => x.type === 'assign_driver'), 'un conductor en tránsito no debe poder asignarse').toEqual([]);
    expect((await routes(ctx)).find((r) => r.id === state.routeId).driver_id ?? null).toBeNull();
    test.info().annotations.push({ type: 'cobertura', description: 'solo se probó el rechazo: no hay un segundo conductor libre para el camino feliz' });
    return;
  }
  const { proposals, response } = await ask(ctx, `Asigna al conductor ${driver.full_name} al viaje de Oruro a La Paz del ${tomorrow} a las 03:17 (hora de Bolivia).`);
  const p = proposals.find((x) => x.type === 'assign_driver');
  expect(p, `no preparó la propuesta: ${response.slice(0, 240)}`).toBeTruthy();
  expect(p.lines).toContain(`Conductor: ${driver.full_name}`);
  expect((await routes(ctx)).find((r) => r.id === state.routeId).driver_id ?? null).toBeNull(); // todavía sin conductor
  await confirm(ctx, p.id);
  expect((await routes(ctx)).find((r) => r.id === state.routeId).driver_id).toBe(driver.id);
});

test('4. cliente y conductor no pueden proponer ninguna de las tres', async ({ browser }) => {
  test.setTimeout(240_000);
  for (const role of ['client', 'driver']) {
    const ctx = await sessionCtx(browser, role);
    for (const q of [
      `Anula el paquete ${state.code ?? 'TRK-0000'}.`,
      `Crea un viaje de Oruro a La Paz para el ${tomorrow} a las 03:17.`,
      `Asigna al conductor Juan al viaje de Oruro a La Paz de mañana.`,
    ]) {
      const { proposals } = await ask(ctx, q);
      expect(proposals.filter((a) => ['cancel_package', 'create_trip', 'assign_driver'].includes(a.type)), `${role}: ${q}`).toEqual([]);
    }
  }
});

test('5. el servidor rechaza confirmar estas acciones a quien no es personal (aunque se conozca el id)', async ({ browser }) => {
  const admin = await sessionCtx(browser, 'admin');
  const { proposals } = await ask(admin, `Crea un viaje de Oruro a La Paz para el ${tomorrow} a las 03:18, sin conductor.`);
  const p = proposals.find((x) => x.type === 'create_trip');
  test.skip(!p, 'el modelo no preparó la propuesta');
  for (const role of ['client', 'driver']) {
    const ctx = await sessionCtx(browser, role);
    const res = await ctx.request.post(`${API}/ai-agent/actions/${p.id}/confirm`, { headers: H });
    expect([403, 404]).toContain(res.status());
  }
  // la propuesta sin confirmar no creó nada: se cancela
  await admin.request.post(`${API}/ai-agent/actions/${p.id}/cancel`, { headers: H });
  const stray = (await routes(admin)).filter((r) => Date.parse(r.departure_time) === Date.parse(`${tomorrow}T07:18:00.000Z`));
  expect(stray).toHaveLength(0);
});
