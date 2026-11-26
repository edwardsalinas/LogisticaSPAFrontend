import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const svc = vi.hoisted(() => ({ pushStatus: vi.fn(), enablePush: vi.fn(), disablePush: vi.fn() }));
vi.mock('../../services/pushService', () => svc);

import usePushNotifications from './usePushNotifications';

beforeEach(() => { vi.clearAllMocks(); });

describe('usePushNotifications', () => {
  it('empieza sin estado (null) y luego muestra el que informa el navegador', async () => {
    svc.pushStatus.mockResolvedValue('off');
    const { result } = renderHook(() => usePushNotifications());
    expect(result.current.status).toBeNull();
    await waitFor(() => expect(result.current.status).toBe('off'));
  });

  it('no consulta nada si está desactivado (por ejemplo, sin sesión)', async () => {
    renderHook(() => usePushNotifications(false));
    await new Promise((r) => setTimeout(r, 20));
    expect(svc.pushStatus).not.toHaveBeenCalled();
  });

  it('si la consulta falla, queda como «no disponible» (la opción simplemente no aparece)', async () => {
    svc.pushStatus.mockRejectedValue(new Error('x'));
    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.status).toBe('unavailable'));
  });

  it('alternar: apagado → activa; encendido → desactiva; mientras trabaja marca busy', async () => {
    svc.pushStatus.mockResolvedValue('off');
    let finish;
    svc.enablePush.mockImplementation(() => new Promise((r) => { finish = r; }));
    svc.disablePush.mockResolvedValue('off');
    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.status).toBe('off'));

    let p;
    act(() => { p = result.current.toggle(); });
    await waitFor(() => expect(result.current.busy).toBe(true));
    await act(async () => { finish('on'); await p; });
    expect(result.current.status).toBe('on');
    expect(result.current.busy).toBe(false);
    expect(svc.enablePush).toHaveBeenCalledTimes(1);

    await act(async () => { await result.current.toggle(); });
    expect(svc.disablePush).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('off');
  });

  it('si el permiso se rechaza queda «denied» (y se explica en la pantalla)', async () => {
    svc.pushStatus.mockResolvedValue('off');
    svc.enablePush.mockResolvedValue('denied');
    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.status).toBe('off'));
    await act(async () => { await result.current.toggle(); });
    expect(result.current.status).toBe('denied');
  });

  it('no actualiza el estado después de desmontarse (sin avisos de React)', async () => {
    let resolve;
    svc.pushStatus.mockImplementation(() => new Promise((r) => { resolve = r; }));
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = renderHook(() => usePushNotifications());
    unmount();
    resolve('on');
    await new Promise((r) => setTimeout(r, 20));
    expect(err).not.toHaveBeenCalled();
    err.mockRestore();
  });
});
