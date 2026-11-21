import { test, expect } from '@playwright/test';
import { login, loginViaUI, watchProblems, visit } from './helpers.js';

// Páginas que cada rol puede ver (según src/app/router.jsx) y páginas que debe tener prohibidas
const FLOWS = {
  admin: {
    allowed: ['/', '/logistics/packages', '/logistics/routes', '/tracking', '/fleet', '/ai-chat', '/analytics'],
    forbidden: ['/driver'],
  },
  operator: {
    allowed: ['/', '/logistics/packages', '/logistics/routes', '/tracking'],
    forbidden: ['/fleet', '/ai-chat', '/analytics', '/driver'],
  },
  driver: {
    allowed: ['/driver'],
    forbidden: ['/logistics/packages', '/logistics/routes', '/fleet', '/analytics'],
  },
  client: {
    allowed: ['/', '/logistics/packages', '/tracking'],
    forbidden: ['/logistics/routes', '/fleet', '/ai-chat', '/analytics', '/driver'],
  },
};

for (const [role, { allowed, forbidden }] of Object.entries(FLOWS)) {
  test.describe(`rol ${role}`, () => {
    test('inicia sesión y recorre sus páginas sin errores', async ({ page }) => {
      const problems = watchProblems(page);
      await login(page, role);

      for (const path of allowed) {
        const before = problems.length;
        const text = await visit(page, path, `${role}${path.replace(/\//g, '_') || '_home'}`);
        const found = problems.slice(before);
        console.log(`  [${role}] ${path.padEnd(22)} ${found.length ? '⚠ ' + found.length + ' problema(s)' : 'ok'}  (${text.replace(/\s+/g, ' ').slice(0, 70)}…)`);
        found.forEach((p) => console.log(`      ${p}`));
        expect(text.trim().length, `${path} no debería quedar en blanco`).toBeGreaterThan(20);
      }
      expect(problems, `Problemas detectados para ${role}:\n${problems.join('\n')}`).toEqual([]);
    });

    test('no puede entrar a páginas de otros roles', async ({ page }) => {
      await login(page, role);
      for (const path of forbidden) {
        await page.goto(path);
        await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
        const pathname = new URL(page.url()).pathname;
        expect(pathname, `${role} no debería permanecer en ${path}`).not.toBe(path);
      }
    });
  });
}

test('sin sesión, las páginas protegidas llevan al login', async ({ page }) => {
  for (const path of ['/', '/logistics/packages', '/driver', '/fleet']) {
    await page.goto(path);
    await page.waitForURL(/\/login/, { timeout: 10_000 });
  }
});

test('credenciales incorrectas muestran un error y no inician sesión', async ({ page }) => {
  await page.goto('/login');
  await page.locator('#email').fill('admin@logistica.bo');
  await page.locator('#password').fill('contraseña-incorrecta');
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('div.bg-red-50')).toBeVisible({ timeout: 10_000 });
  expect(new URL(page.url()).pathname).toBe('/login');
});

test('el login por la interfaz lleva al panel de cada rol', async ({ page }) => {
  // El único inicio de sesión por la interfaz dentro de las pruebas (global-setup ya inicia uno por rol)
  await loginViaUI(page, 'admin');
  await expect(page.getByText('admin@logistica.bo')).toBeVisible();
  await page.getByRole('button', { name: /cerrar sesion/i }).click();
  await page.waitForURL(/\/login/, { timeout: 10_000 });
});
