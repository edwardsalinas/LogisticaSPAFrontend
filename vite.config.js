import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    // Alias @ -> src (lo usan los componentes de shadcn/ui)
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
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
    include: [
      'react', 'react-dom', 'react-router-dom', 'recharts', 'leaflet', 'react-leaflet',
      '@fullcalendar/react', '@fullcalendar/daygrid', '@fullcalendar/timegrid', '@fullcalendar/interaction'
    ],
  },
});
