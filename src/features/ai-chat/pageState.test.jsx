import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { buildChatContext, getScreenState, useRegisterScreenState } from './pageContext';

afterEach(() => window.history.pushState({}, '', '/'));

describe('lo que la pantalla informa a Logi: filtros y filas a la vista', () => {
  it('el contexto del chat lleva los filtros puestos (sin los vacíos) y lo que se ve', () => {
    window.history.pushState({}, '', '/logistics/packages');
    renderHook(() => useRegisterScreenState({ filters: { search: ' Oruro ', date: '2026-11-30', origin: '' }, visible: { count: 3, codes: ['TRK-1'] } }));
    const ctx = buildChatContext();
    expect(ctx.path).toBe('/logistics/packages');
    expect(ctx.filters).toEqual({ search: ' Oruro ', date: '2026-11-30' }); // el origen vacío no viaja
    expect(ctx.visible).toEqual({ count: 3, codes: ['TRK-1'] });
  });

  it('al salir de la pantalla se retira: no queda un filtro viejo en el contexto', () => {
    const { unmount } = renderHook(() => useRegisterScreenState({ filters: { search: 'x' }, visible: { count: 1, codes: [] } }));
    expect(getScreenState()).not.toBeNull();
    unmount();
    expect(getScreenState()).toBeNull();
    expect(buildChatContext().filters).toBeUndefined();
    expect(buildChatContext().visible).toBeUndefined();
  });

  it('mientras la pantalla carga (null) no informa nada', () => {
    renderHook(() => useRegisterScreenState(null));
    expect(buildChatContext().visible).toBeUndefined();
  });

  it('cambia con la pantalla: el último estado manda', () => {
    const { rerender } = renderHook(({ n }) => useRegisterScreenState({ filters: { search: '' }, visible: { count: n, codes: [] } }), { initialProps: { n: 5 } });
    expect(buildChatContext().visible.count).toBe(5);
    rerender({ n: 2 });
    expect(buildChatContext().visible.count).toBe(2);
  });
});
