import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LogiCompanion, { speechFromReply } from './LogiCompanion';

let reduced = false;
vi.mock('../voice', () => ({ prefersReducedMotion: () => reduced }));

const setup = (props = {}) => render(<LogiCompanion open={false} status="idle" text="" reply="" wander onToggle={() => {}} panelId="p" {...props} />);
const robot = (container) => container.querySelector('svg.logi');
const bubble = (container) => container.querySelector('.logi-bubble');

describe('speechFromReply', () => {
  it('toma la primera frase y quita el formato', () => {
    expect(speechFromReply('**Hoy** hay 3 paquetes por atender. Los demás van bien.')).toBe('Hoy hay 3 paquetes por atender.');
  });
  it('recorta lo muy largo y no falla con vacío', () => {
    expect(speechFromReply('a'.repeat(300)).length).toBeLessThanOrEqual(110);
    expect(speechFromReply('')).toBe('');
    expect(speechFromReply(null)).toBe('');
  });
});

describe('Logi, el compañero', () => {
  beforeEach(() => { vi.useFakeTimers(); reduced = false; window.sessionStorage.clear(); window.sessionStorage.setItem('logi:saludo', '1'); });
  afterEach(() => { vi.useRealTimers(); });

  it('no se dibuja con el chat abierto (está en su encabezado)', () => {
    const { container } = setup({ open: true });
    expect(robot(container)).toBeNull();
  });

  it('un clic abre el chat', () => {
    const onToggle = vi.fn();
    setup({ onToggle });
    fireEvent.click(screen.getByRole('button', { name: /abrir asistente ia/i }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('con una respuesta nueva se detiene y la dice en un globo', () => {
    const { container } = setup({ status: 'unread', text: 'Nueva respuesta', reply: 'Tienes 2 paquetes en ruta. Todo bien.' });
    expect(bubble(container)).toHaveTextContent('Tienes 2 paquetes en ruta.');
    expect(robot(container)).toHaveAttribute('data-mood', 'unread');
    act(() => { vi.advanceTimersByTime(10000); });
    expect(bubble(container)).toBeNull(); // el globo se recoge solo
  });

  it('avisa cuando necesita una confirmación y mientras piensa', () => {
    const a = setup({ status: 'confirm', text: 'Espera tu confirmación' });
    expect(bubble(a.container)).toHaveTextContent('necesito tu confirmación');
    a.unmount();
    const b = setup({ status: 'thinking', text: 'Pensando…' });
    expect(bubble(b.container)).toHaveTextContent('Pensando');
    expect(robot(b.container)).toHaveAttribute('data-mood', 'thinking');
  });

  it('saluda una vez por sesión', () => {
    window.sessionStorage.clear();
    const { container } = setup();
    act(() => { vi.advanceTimersByTime(1600); });
    expect(bubble(container)).toHaveTextContent('Soy Logi');
    expect(window.sessionStorage.getItem('logi:saludo')).toBe('1');
  });

  it('pasea: pasados unos segundos echa a andar', () => {
    const { container } = setup();
    expect(robot(container)).not.toHaveClass('logi--walking');
    act(() => { vi.advanceTimersByTime(2100); });
    expect(robot(container)).toHaveClass('logi--walking');
  });

  it('se queda quieto si pasas el cursor, si el chat tiene algo que decir, si se desactiva o si se pide menos movimiento', () => {
    const hover = setup();
    act(() => { vi.advanceTimersByTime(2100); });
    expect(robot(hover.container)).toHaveClass('logi--walking');
    fireEvent.pointerEnter(screen.getByRole('button', { name: /abrir asistente ia/i }));
    expect(robot(hover.container)).not.toHaveClass('logi--walking');
    hover.unmount();

    const off = setup({ wander: false });
    act(() => { vi.advanceTimersByTime(5000); });
    expect(robot(off.container)).not.toHaveClass('logi--walking');
    off.unmount();

    const busy = setup({ status: 'thinking' });
    act(() => { vi.advanceTimersByTime(5000); });
    expect(robot(busy.container)).not.toHaveClass('logi--walking');
    busy.unmount();

    reduced = true;
    const calm = setup();
    act(() => { vi.advanceTimersByTime(5000); });
    expect(robot(calm.container)).not.toHaveClass('logi--walking');
  });
});
