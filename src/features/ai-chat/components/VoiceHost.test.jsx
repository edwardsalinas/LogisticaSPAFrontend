import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import VoiceHost from './VoiceHost';
import { voiceDock } from '../voiceDock';

let aiMode = false;
vi.mock('../../../app/AiModeContext', () => ({ useAiMode: () => ({ aiMode }) }));
vi.mock('../useAssistantChat', () => ({ default: () => ({ messages: [], send: vi.fn(), loading: false }) }));
vi.mock('./VoiceMode', () => ({
  default: ({ compact, initialText, wake }) => <div data-testid="voice" data-compact={String(compact)} data-initial={initialText} data-wake={String(wake)} />,
}));

const at = (path) => render(<MemoryRouter initialEntries={[path]}><VoiceHost /></MemoryRouter>);

describe('VoiceHost: barra compacta o pantalla completa', () => {
  beforeEach(() => { aiMode = false; window.sessionStorage.clear(); });
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
