import { defineConfig } from '@playwright/test';

/**
 * Pruebas end-to-end (flujos reales en el navegador). Requieren el backend (http://localhost:3000)
 * y el frontend (npm run dev, http://localhost:5173) corriendo, y usuarios de prueba (ver e2e/users.js).
 *   npm run e2e          # en segundo plano (headless)
 *   npm run e2e:headed   # viendo el navegador
 * Usa el Chrome instalado en el equipo (no descarga otro navegador).
 */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.js',
  timeout: 60_000,
  workers: 1, // los flujos comparten datos en la misma base
  fullyParallel: false,
  reporter: [['list']],
  outputDir: './e2e-results',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    channel: 'chrome',
    headless: true, // con --headed se abre el navegador visible
    viewport: { width: 1366, height: 800 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    locale: 'es-BO',
  },
});
