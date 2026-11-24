import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LogiCompanion, { speechFromReply } from './LogiCompanion';
import { setSpeakPref } from '../speakPref';

let reduced = false;
vi.mock('../voice', async (original) => ({ ...(await original()), prefersReducedMotion: () => reduced }));

// voz del navegador simulada: se puede ver qué se le pide leer
const synth = { supported: true, speaking: false, speak: vi.fn(), cancel: vi.fn() };
vi.mock('../useVoice', () => ({ useSpeechSynthesis: () => synth }));

const setup = (props = {}) => render(<LogiCompanion open={false} status="idle" text="" reply="" wander onToggle={() => {}} panelId="p" {...props} />);
const robot = (container) => container.querySelector('svg.logi');
const bubble = (container) => container.querySelector('.logi-bubble');

describe('speechFromReply', () => {
  it('toma la primera frase y quita el formato', () => {
    expect(speechFromReply('**Hoy** hay 3 paquetes por atender. Los demás van bien.')).toBe('Hoy hay 3 paquetes por atender.');
  });
  it('con título y viñetas dice solo el título, sin mezclarlo con la lista', () => {
    expect(speechFromReply('### Resumen de la operación – martes 24\n\n**KPIs**\n- En tránsito: 0\n- Pendientes: 4')).toBe('Resumen de la operación – martes 24');
  });
  it('recorta lo muy largo y no falla con vacío', () => {
    expect(speechFromReply('a'.repeat(300)).length).toBeLessThanOrEqual(110);
    expect(speechFromReply('')).toBe('');
    expect(speechFromReply(null)).toBe('');
  });
});

describe('Logi, el compañero', () => {
  beforeEach(() => {
    vi.useFakeTimers(); reduced = false; window.sessionStorage.clear(); window.sessionStorage.setItem('logi:saludo', '1');
    synth.supported = true; synth.speaking = false; synth.speak.mockClear(); synth.cancel.mockClear();
    setSpeakPref(false);
  });
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

  it('en el borde derecho, aunque el azar lo mande hacia afuera, camina hacia donde hay sitio (antes no se movía)', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.99); // destino pegado al borde + dirección hacia afuera
    const { container } = setup();
    act(() => { vi.advanceTimersByTime(2100); });
    expect(robot(container)).toHaveClass('logi--walking');
    random.mockRestore();
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
  describe('lectura en voz alta', () => {
    const reply = '**Hoy** hay 3 paquetes por atender, TRK-1795301842652-9113E39E entre ellos. Los demás van bien.';

    it('con «leer respuestas» activado lee la respuesta nueva, limpia y una sola vez', () => {
      setSpeakPref(true);
      const { rerender } = setup({ status: 'unread', text: 'Nueva respuesta', reply });
      expect(synth.speak).toHaveBeenCalledTimes(1);
      const said = synth.speak.mock.calls[0][0];
      expect(said).toContain('paquetes por atender');
      expect(said).not.toContain('**');
      expect(said).not.toContain('1795301842652'); // el código entero no se deletrea
      rerender(<LogiCompanion open={false} status="unread" text="Nueva respuesta" reply={reply} wander onToggle={() => {}} panelId="p" />);
      expect(synth.speak).toHaveBeenCalledTimes(1);
    });

    it('avisa en voz alta cuando necesita una confirmación', () => {
      setSpeakPref(true);
      setup({ status: 'confirm', text: 'Espera tu confirmación' });
      expect(synth.speak).toHaveBeenCalledWith(expect.stringContaining('necesito tu confirmación'));
    });

    it('con «leer respuestas» apagado no habla solo, pero el globo ofrece «Escuchar»', () => {
      const { container } = setup({ status: 'unread', text: 'Nueva respuesta', reply });
      expect(synth.speak).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: /escuchar/i }));
      expect(synth.speak).toHaveBeenCalledWith(expect.stringContaining('paquetes por atender'));
      expect(bubble(container)).not.toBeNull();
    });

    it('mueve la boca mientras habla y «Silenciar a Logi» corta la voz y apaga la lectura', () => {
      setSpeakPref(true);
      synth.speaking = true;
      const { container } = setup({ status: 'unread', text: 'Nueva respuesta', reply });
      expect(robot(container)).toHaveAttribute('data-mood', 'talking');
      fireEvent.click(screen.getByRole('button', { name: /silenciar a logi/i }));
      expect(synth.cancel).toHaveBeenCalled();
      expect(window.localStorage.getItem('logistica:ai-speak-replies')).toBe('0');
    });

    it('no lee nada con el chat abierto ni si el navegador no tiene voz', () => {
      setSpeakPref(true);
      setup({ open: true, status: 'unread', text: 'Nueva respuesta', reply });
      expect(synth.speak).not.toHaveBeenCalled();
      synth.supported = false;
      const { container } = setup({ status: 'unread', text: 'Nueva respuesta', reply });
      expect(synth.speak).not.toHaveBeenCalled();
      expect(screen.queryByRole('button', { name: /escuchar/i })).not.toBeInTheDocument();
      expect(bubble(container)).toHaveTextContent('paquetes por atender');
    });
  });
});
