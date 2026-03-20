import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    // Chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Minificación con esbuild
    minify: 'esbuild',
    // Sin sourcemaps para producción (reduce tamaño)
    sourcemap: false,
  },
  // Optimización de dependencias para dev más rápido
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'recharts', 'leaflet', 'react-leaflet'],
  },
});
