import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import VoiceHost from './VoiceHost';
import { voiceDock } from '../voiceDock';
import { getPageView, requestTab, setPageView } from '../pageContext';
import { getPrefs, savePrefs, _resetPrefsCache } from '../alerts/alertPrefs';

let aiMode = false;
let role = 'admin';
let lastProps = {};
vi.mock('../../../app/AiModeContext', () => ({ useAiMode: () => ({ aiMode }) }));
vi.mock('../../../app/useRole', () => ({ default: () => ({ role }), useRole: () => ({ role }) }));
vi.mock('../useAssistantChat', () => ({ default: () => ({ messages: [], send: vi.fn(), loading: false }) }));
vi.mock('./VoiceMode', () => ({
  default: (props) => {
    lastProps = props;
    return <div data-testid="voice" data-compact={String(props.compact)} data-initial={props.initialText} data-wake={String(props.wake)} />;
  },
}));

function Where() { const l = useLocation(); return <p data-testid="where">{l.pathname}</p>; }
const at = (path, extra = {}) => render(<MemoryRouter initialEntries={[path]}><Where /><VoiceHost {...extra} /></MemoryRouter>);

describe('VoiceHost: barra compacta o pantalla completa', () => {
  beforeEach(() => { aiMode = false; role = 'admin'; lastProps = {}; window.sessionStorage.clear(); });
  afterEach(() => { cleanup(); act(() => voiceDock.close()); });

  it('cerrado no pinta nada', () => {
    at('/dashboard');
    expect(screen.queryByTestId('voice')).toBeNull();
  });

  it('en una pantalla normal se abre la barra compacta', () => {
    at('/dashboard');
    act(() => voiceDock.open());
    expect(screen.getByTestId('voice').dataset.compact).toBe('true');
  });

  it('en la pantalla del asistente se abre completa', () => {
    at('/assistant');
    act(() => voiceDock.open());
    expect(screen.getByTestId('voice').dataset.compact).toBe('false');
  });

  it('en el Modo IA (la página principal ES el asistente) se abre completa; sin Modo IA, en «/» es compacta', () => {
    aiMode = true;
    const first = at('/');
    act(() => voiceDock.open());
    expect(screen.getByTestId('voice').dataset.compact).toBe('false');
    first.unmount();
    act(() => voiceDock.close());

    aiMode = false;
    at('/');
    act(() => voiceDock.open());
    expect(screen.getByTestId('voice').dataset.compact).toBe('true');
  });

  it('pasa lo que se dijo tras «hey Logi» y que se abrió por la frase de activación', () => {
    at('/dashboard');
    act(() => voiceDock.open({ initial: 'ayúdame a crear un paquete', wake: true }));
    expect(screen.getByTestId('voice').dataset.initial).toBe('ayúdame a crear un paquete');
    expect(screen.getByTestId('voice').dataset.wake).toBe('true');
  });

  it('se registra como anfitrión mientras está montado (el micrófono del chat lo usa en vez de abrir el suyo)', () => {
    expect(voiceDock.hasHost()).toBe(false);
    const view = at('/dashboard');
    expect(voiceDock.hasHost()).toBe(true);
    view.unmount();
    expect(voiceDock.hasHost()).toBe(false);
  });
});

describe('VoiceHost: órdenes de voz', () => {
  beforeEach(() => { aiMode = false; role = 'admin'; lastProps = {}; window.sessionStorage.clear(); _resetPrefsCache(); setPageView(null); });
  afterEach(() => { cleanup(); act(() => voiceDock.close()); });

  const run = (text) => { let out; act(() => { out = lastProps.onCommand(text); }); return out; };
  const open = (path = '/dashboard', extra) => { const v = at(path, extra); act(() => voiceDock.open()); return v; };

  it('«llévame a Viajes» navega y responde en voz alta', () => {
    open();
    expect(run('llévame a Viajes')).toEqual({ say: 'Voy a Viajes.' });
    expect(screen.getByTestId('where').textContent).toBe('/logistics/routes');
  });

  it('una pregunta NO es una orden: devuelve null y no navega (la atiende el asistente)', () => {
    open();
    expect(run('muéstrame los paquetes pendientes de María')).toBeNull();
    expect(run('¿qué viajes hay mañana?')).toBeNull();
    expect(screen.getByTestId('where').textContent).toBe('/dashboard');
  });

  it('«muéstrame los paquetes entregados» navega y deja pedida la pestaña del histórico', () => {
    open();
    run('muéstrame los paquetes entregados');
    expect(screen.getByTestId('where').textContent).toBe('/logistics/packages');
    expect(JSON.parse(window.sessionStorage.getItem('logisticaspa:filtros:paquetes:pestana'))).toBe('delivered');
  });

  it('una pantalla que ya está abierta recibe el pedido de pestaña al momento', () => {
    open('/fleet');
    const seen = [];
    const on = (e) => seen.push(e.detail);
    window.addEventListener('logi:pestana', on);
    run('muéstrame los conductores');
    window.removeEventListener('logi:pestana', on);
    expect(seen).toEqual([{ page: 'fleet', value: 'drivers' }]);
  });

  it('cada rol navega solo a lo suyo; lo demás se explica y no se navega', () => {
    role = 'client';
    open('/logistics/packages');
    expect(run('abre la flota')).toEqual({ say: 'No tienes la Flota disponible con tu rol.' });
    expect(screen.getByTestId('where').textContent).toBe('/logistics/packages');
  });

  it('«cierra» responde y pide cerrar el chat de voz después de decirlo', () => {
    open();
    expect(run('gracias, cierra')).toEqual({ say: 'Hasta luego.', close: true });
  });

  it('«quédate quieto» y «camina» llaman a pausar o reanudar el paseo de Logi', () => {
    const onLogiWalk = vi.fn();
    open('/dashboard', { onLogiWalk });
    run('quédate quieto');
    run('camina');
    expect(onLogiWalk.mock.calls).toEqual([[false], [true]]);
  });

  it('«no me avises» y «avísame» apagan y encienden los avisos de Logi', () => {
    open();
    run('no me avises');
    expect(getPrefs().enabled).toBe(false);
    run('avísame');
    expect(getPrefs().enabled).toBe(true);
  });

  it('en pantalla completa, una orden de navegación pasa a la barra compacta para poder ver la pantalla', () => {
    window.sessionStorage.setItem('logisticaspa:filtros:asistente:voz-completa', 'true');
    open('/dashboard');
    expect(screen.getByTestId('voice').dataset.compact).toBe('false');
    run('abre los viajes');
    expect(screen.getByTestId('voice').dataset.compact).toBe('true');
  });
});
