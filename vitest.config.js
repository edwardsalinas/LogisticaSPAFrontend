import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Mismo alias @ -> src que vite.config.js
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.js',
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    // Los plazos por defecto (5 s por prueba) son justos: varias pruebas con servidor simulado (MSW) y jsdom tardan ~5 s cuando la máquina va
    // cargada, y en un runner de CI (menos CPU) fallaban de forma intermitente sin ningún error real. Una prueba correcta no debe fallar por
    // ir en una máquina lenta; una colgada de verdad sigue fallando, solo que tras 30 s.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
