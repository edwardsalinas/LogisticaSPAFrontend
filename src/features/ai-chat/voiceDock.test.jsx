import { act, render, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { _resetVoiceDock, useVoicePresenter, useVoiceUi, voiceDock } from './voiceDock';
import VoiceStrip from './components/VoiceStrip';
import { noteCreatedPackage, requestSearch, takeCreatedPackage, useSearchRequests } from './pageContext';

afterEach(() => { _resetVoiceDock(); window.sessionStorage.clear(); });

const controls = () => ({ orb: vi.fn(), answer: vi.fn(), handsFree: vi.fn(), close: vi.fn(), expand: vi.fn() });
const live = (over = {}) => ({ phase: 'listening', caption: null, notice: null, error: null, assisting: false, handsFree: true, supported: true, pending: null, reply: '', mouth: null, controls: controls(), ...over });

describe('la voz de Logi no tiene ventana propia: se publica y la muestra quien esté a la vista', () => {
  it('sin nadie que la muestre, presenters es 0 (el motor dibuja su tarjeta de siempre)', () => {
    const { result } = renderHook(() => useVoiceUi());
    expect(result.current.presenters).toBe(0);
  });

  it('el chat o Logi se anotan mientras están a la vista y se retiran al salir', () => {
    const ui = renderHook(() => useVoiceUi());
    const a = renderHook(() => useVoicePresenter(true));
    expect(ui.result.current.presenters).toBe(1);
    renderHook(() => useVoicePresenter(false)); // oculto: no cuenta
    expect(ui.result.current.presenters).toBe(1);
    a.unmount();
    expect(ui.result.current.presenters).toBe(0);
  });

  it('publicar el mismo estado no vuelve a notificar; uno distinto sí; cerrar lo borra', () => {
    const ui = renderHook(() => useVoiceUi());
    const c = controls();
    act(() => voiceDock.publish(live({ controls: c })));
    const first = ui.result.current;
    act(() => voiceDock.publish(live({ controls: c })));
    expect(ui.result.current).toBe(first);
    act(() => voiceDock.publish(live({ controls: c, phase: 'speaking', mouth: 0.8 })));
    expect(ui.result.current.live.phase).toBe('speaking');
    act(() => voiceDock.close());
    expect(ui.result.current.live).toBeNull();
  });
});

describe('VoiceStrip', () => {
  it('muestra la fase, lo que oye y los controles; el micrófono, salir y manos libres llaman al motor', () => {
    const l = live({ caption: 'crea un paquete' });
    render(<VoiceStrip live={l} />);
    expect(screen.getByTestId('voice-phase').textContent).toBe('Te escucho…');
    expect(screen.getByText(/crea un paquete/)).toBeTruthy();
    screen.getByRole('button', { name: 'Dejar de escuchar' }).click();
    screen.getByRole('button', { name: 'Salir del chat de voz' }).click();
    screen.getByRole('button', { name: 'Pantalla completa' }).click();
    screen.getByRole('checkbox', { name: /Manos libres/ }).click();
    expect(l.controls.orb).toHaveBeenCalled();
    expect(l.controls.close).toHaveBeenCalled();
    expect(l.controls.expand).toHaveBeenCalled();
    expect(l.controls.handsFree).toHaveBeenCalledWith(false);
  });

  it('con una acción pendiente muestra el resumen y los botones «Sí, hazlo» y «Cancelar»', () => {
    const l = live({ phase: 'idle', pending: { id: 'a1', title: 'Registrar paquete', lines: ['La Paz → Oruro'] } });
    render(<VoiceStrip live={l} />);
    expect(screen.getByText('La Paz → Oruro')).toBeTruthy();
    screen.getByRole('button', { name: 'Sí, hazlo' }).click();
    screen.getByRole('button', { name: 'Cancelar' }).click();
    expect(l.controls.answer).toHaveBeenNthCalledWith(1, 'sí');
    expect(l.controls.answer).toHaveBeenNthCalledWith(2, 'cancela');
  });

  it('en el globo de Logi repite la respuesta; en el chat no (ya está escrita en la conversación)', () => {
    const l = live({ phase: 'idle', reply: 'Hay 3 paquetes pendientes.' });
    const { unmount } = render(<VoiceStrip live={l} variant="bubble" />);
    expect(screen.getByText('Hay 3 paquetes pendientes.')).toBeTruthy();
    unmount();
    render(<VoiceStrip live={l} variant="panel" />);
    expect(screen.queryByText('Hay 3 paquetes pendientes.')).toBeNull();
  });

  it('sin reconocimiento de voz avisa que se use Chrome o Edge', () => {
    render(<VoiceStrip live={live({ supported: false })} />);
    expect(screen.getByRole('alert').textContent).toMatch(/Chrome o Edge/);
  });
});

describe('«muéstrame lo que acabas de hacer»: la tabla se filtra por lo pedido', () => {
  it('requestSearch avisa a la pantalla abierta y la deja recordada si aún no se abrió', () => {
    const setSearch = vi.fn();
    renderHook(() => useSearchRequests('packages', setSearch));
    act(() => requestSearch('packages', 'TRK-123'));
    expect(setSearch).toHaveBeenCalledWith('TRK-123');
    expect(JSON.parse(window.sessionStorage.getItem('logisticaspa:filtros:paquetes:busqueda'))).toBe('TRK-123');
    expect(JSON.parse(window.sessionStorage.getItem('logisticaspa:filtros:paquetes:pestana'))).toBe('all'); // y vuelve a la pestaña principal
  });

  it('ignora los pedidos de otra pantalla', () => {
    const setSearch = vi.fn();
    renderHook(() => useSearchRequests('packages', setSearch));
    act(() => requestSearch('fleet', 'x'));
    expect(setSearch).not.toHaveBeenCalled();
  });

  it('recuerda el último paquete registrado una sola vez', () => {
    noteCreatedPackage({ tracking_code: 'TRK-9' });
    expect(takeCreatedPackage()).toBe('TRK-9');
    expect(takeCreatedPackage()).toBeNull();
    noteCreatedPackage(undefined);
    expect(takeCreatedPackage()).toBeNull();
  });
});
