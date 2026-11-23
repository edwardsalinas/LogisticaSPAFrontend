import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import usePersistentState from './usePersistentState';

describe('usePersistentState', () => {
  beforeEach(() => window.sessionStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('empieza con el valor inicial y lo guarda al cambiar', () => {
    const { result } = renderHook(() => usePersistentState('flota:busqueda', ''));
    expect(result.current[0]).toBe('');
    act(() => result.current[1]('XYZ'));
    expect(result.current[0]).toBe('XYZ');
    expect(JSON.parse(window.sessionStorage.getItem('logisticaspa:filtros:flota:busqueda'))).toBe('XYZ');
  });

  it('al volver a la pantalla recupera lo que el usuario había dejado', () => {
    const primera = renderHook(() => usePersistentState('flota:pestana', 'vehicles'));
    act(() => primera.result.current[1]('drivers'));
    primera.unmount();

    const segunda = renderHook(() => usePersistentState('flota:pestana', 'vehicles'));
    expect(segunda.result.current[0]).toBe('drivers');
  });

  it('cada clave es independiente', () => {
    const a = renderHook(() => usePersistentState('a', 1));
    const b = renderHook(() => usePersistentState('b', 2));
    act(() => a.result.current[1](10));
    expect(b.result.current[0]).toBe(2);
  });

  it('reset vuelve al valor inicial', () => {
    const { result } = renderHook(() => usePersistentState('viajes:conductor', ''));
    act(() => result.current[1]('abc'));
    act(() => result.current[2]());
    expect(result.current[0]).toBe('');
  });

  it('un valor guardado dañado no rompe la pantalla: se usa el inicial', () => {
    window.sessionStorage.setItem('logisticaspa:filtros:x', '{no es json');
    const { result } = renderHook(() => usePersistentState('x', 'inicial'));
    expect(result.current[0]).toBe('inicial');
  });

  it('si el almacenamiento está bloqueado sigue funcionando como un estado normal', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqueado'); });
    const { result } = renderHook(() => usePersistentState('y', 'a'));
    act(() => result.current[1]('b'));
    expect(result.current[0]).toBe('b');
  });
});
