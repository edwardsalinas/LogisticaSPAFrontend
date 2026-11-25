import { act, cleanup, render, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { buildChatContext, getPageEntity, setPageEntity, usePageEntity, useRegisterPageEntity } from './pageContext';
import { suggestionsForEntity } from './suggestions';

afterEach(() => { cleanup(); setPageEntity(null); window.history.pushState({}, '', '/'); });

function Page({ entity }) { useRegisterPageEntity(entity); return null; }

describe('pageContext: lo que se está viendo', () => {
  it('una pantalla registra su paquete y lo retira al salir', () => {
    const { unmount } = render(<Page entity={{ type: 'package', ref: 'TRK-1' }} />);
    expect(getPageEntity()).toEqual({ type: 'package', ref: 'TRK-1' });
    unmount();
    expect(getPageEntity()).toBeNull();
  });

  it('cambiar de paquete actualiza; sin código (cargando o dato de ejemplo) no hay nada', () => {
    const { rerender } = render(<Page entity={{ type: 'package', ref: 'TRK-1' }} />);
    rerender(<Page entity={{ type: 'package', ref: 'TRK-2' }} />);
    expect(getPageEntity().ref).toBe('TRK-2');
    rerender(<Page entity={null} />);
    expect(getPageEntity()).toBeNull();
    rerender(<Page entity={{ type: 'package', ref: '' }} />);
    expect(getPageEntity()).toBeNull();
  });

  it('el chat envía la ruta actual y, si hay, lo que se ve; sin nada, solo la ruta', () => {
    window.history.pushState({}, '', '/logistics/packages/abc');
    expect(buildChatContext()).toEqual({ path: '/logistics/packages/abc' });
    setPageEntity({ type: 'package', ref: 'TRK-9' });
    expect(buildChatContext()).toEqual({ path: '/logistics/packages/abc', entity: { type: 'package', ref: 'TRK-9' } });
  });

  it('usePageEntity reacciona a los cambios', () => {
    const { result } = renderHook(() => usePageEntity());
    expect(result.current).toBeNull();
    act(() => setPageEntity({ type: 'route', ref: 'RT-1' }));
    expect(result.current).toEqual({ type: 'route', ref: 'RT-1' });
  });
});

describe('suggestionsForEntity: preguntas sobre lo que se ve', () => {
  it('un paquete ofrece «este paquete»; el personal además puede asignarlo', () => {
    const client = suggestionsForEntity({ type: 'package', ref: 'TRK-1' }, 'client').map((s) => s.value);
    expect(client).toEqual(['¿Dónde está este paquete?', '¿En qué estado está este paquete y cuándo llega?']);
    const staff = suggestionsForEntity({ type: 'package', ref: 'TRK-1' }, 'admin').map((s) => s.value);
    expect(staff).toContain('Asigna este paquete a un viaje');
  });
  it('un viaje solo es para el personal; sin nada en pantalla no hay sugerencias propias', () => {
    expect(suggestionsForEntity({ type: 'route', ref: 'RT-1' }, 'operator')).toEqual([]);
    expect(suggestionsForEntity({ type: 'route', ref: 'RT-1' }, 'logistics_operator').map((s) => s.value)).toEqual(['¿Cuánto espacio queda en este viaje?', '¿Qué paquetes lleva este viaje?']);
    expect(suggestionsForEntity(null, 'admin')).toEqual([]);
  });
});
