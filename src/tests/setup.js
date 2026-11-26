import '@testing-library/jest-dom';
import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';

// waitFor / findBy esperan 1 s por defecto: con la máquina cargada no alcanza para que React termine de dibujar tras una respuesta simulada
configure({ asyncUtilTimeout: 5000 });

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

// jsdom no trae ResizeObserver ni scrollIntoView (los usan cmdk y Radix)
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
