import { test, expect } from '@playwright/test';
import { login, openScreen, closeLeakedContexts } from './helpers.js';

test.afterEach(closeLeakedContexts);

/**
 * Política de contenido (CSP) de la página, en un navegador real. Solo corre contra un servidor que la envíe (nginx en producción o
 * «node scripts/serve-csp.mjs» con «npm run build» hecho con VITE_API_URL=http://localhost:3000/api), por ejemplo:
 *   E2E_BASE_URL=http://localhost:8080 npx playwright test e2e/seguridad-csp.spec.js
 * Con el servidor de desarrollo (sin CSP) se omite sola.
 */
const WATCH = () => {
  window.__csp = [];
  document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ← ${e.blockedURI}`));
};

const PAGES = {
  admin: ['/', '/tracking', '/fleet', '/assistant', '/ai-usage'],
  operator: ['/', '/tracking'],
  driver: ['/'],
  client: ['/'],
};

for (const [role, paths] of Object.entries(PAGES)) {
  test(`la política de contenido no bloquea nada de la aplicación (${role})`, async ({ page, request, baseURL }) => {
    test.setTimeout(240_000);
    const head = await request.get(baseURL);
    test.skip(!head.headers()['content-security-policy'], 'este servidor no envía política de contenido');
    await page.addInitScript(WATCH);
    await login(page, role);
    const seen = [];
    for (const path of paths) {
      await openScreen(page, path, (pg) => pg.locator('main, #root').first());
      await page.waitForTimeout(2500);
      seen.push(...(await page.evaluate(() => window.__csp ?? [])));
    }
    // Zod 4 prueba «new Function('')» dentro de un try/catch para saber si puede compilar validadores y, si la política lo bloquea, usa su
    // camino sin eval: es el único aviso conocido y inofensivo. NO se abre 'unsafe-eval' por eso.
    const real = seen.filter((v) => v !== 'script-src ← eval');
    expect(real, real.join('\n')).toEqual([]);
  });
}

test('un script en línea inyectado en la página NO se ejecuta y el navegador lo registra como violación', async ({ page, request, baseURL }) => {
  const head = await request.get(baseURL);
  test.skip(!head.headers()['content-security-policy'], 'este servidor no envía política de contenido');
  await page.addInitScript(WATCH);
  await page.goto('/login');
  const ran = await page.evaluate(() => new Promise((resolve) => {
    window.__pwned = false;
    const s = document.createElement('script');
    s.textContent = 'window.__pwned = true';
    document.body.appendChild(s);
    const img = new Image(); // y una imagen de un sitio ajeno tampoco se pide
    img.src = 'https://sitio-ajeno.example/pixel.png?datos=1';
    document.body.appendChild(img);
    setTimeout(() => resolve(window.__pwned), 500);
  }));
  expect(ran).toBe(false);
  const v = await page.evaluate(() => window.__csp);
  expect(v.some((x) => x.startsWith('script-src'))).toBe(true);
  expect(v.some((x) => x.startsWith('img-src') && x.includes('sitio-ajeno'))).toBe(true);
});

test('con la política activa el service worker se registra y carga su script de avisos (si se bloqueara, se caería también la cola de puntos GPS)', async ({ page, request, baseURL }) => {
  test.setTimeout(120_000);
  const head = await request.get(baseURL);
  test.skip(!head.headers()['content-security-policy'], 'este servidor no envía política de contenido');
  await page.addInitScript(WATCH);
  await login(page, 'driver');
  await openScreen(page, '/', (pg) => pg.locator('main, #root').first());
  const info = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    const res = await fetch('/push-handlers.js');
    return { active: Boolean(reg.active), scope: reg.scope, handlers: res.ok, type: res.headers.get('content-type') };
  });
  expect(info.active).toBe(true);
  expect(info.handlers).toBe(true);
  expect(info.type).toMatch(/javascript/);
  const violations = (await page.evaluate(() => window.__csp ?? [])).filter((v) => v !== 'script-src ← eval');
  expect(violations, violations.join('\n')).toEqual([]);
});
