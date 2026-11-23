import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});

// jsdom no implementa canvas/WebGL: los efectos visuales (React Bits) se detienen solos cuando getContext devuelve null
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = () => null;
}

// jsdom no trae IntersectionObserver: los textos animados (React Bits) quedan visibles para lectores de pantalla sin disparar la animación
if (typeof globalThis.IntersectionObserver === 'undefined') {
  globalThis.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  };
}
