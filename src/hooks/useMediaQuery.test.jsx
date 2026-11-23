import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import useMediaQuery from './useMediaQuery';

const original = window.matchMedia;

const fakeMatchMedia = (initial) => {
  const listeners = new Set();
  const mql = {
    matches: initial,
    addEventListener: (_type, fn) => listeners.add(fn),
    removeEventListener: (_type, fn) => listeners.delete(fn),
  };
  window.matchMedia = vi.fn(() => mql);
  return {
    change: (matches) => {
      mql.matches = matches;
      listeners.forEach((fn) => fn({ matches }));
    },
    listeners,
  };
};

describe('useMediaQuery', () => {
  afterEach(() => {
    window.matchMedia = original;
  });

  it('sin matchMedia (pruebas, navegadores antiguos) devuelve false y no falla', () => {
    window.matchMedia = undefined;
    const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'));
    expect(result.current).toBe(false);
  });

  it('devuelve si la consulta coincide ahora y se actualiza cuando cambia', () => {
    const media = fakeMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'));
    expect(result.current).toBe(true);

    act(() => media.change(false));
    expect(result.current).toBe(false);
  });

  it('deja de escuchar al desmontarse', () => {
    const media = fakeMatchMedia(false);
    const { unmount } = renderHook(() => useMediaQuery('(max-width: 767px)'));
    expect(media.listeners.size).toBe(1);
    unmount();
    expect(media.listeners.size).toBe(0);
  });
});
