import { render, screen, waitFor, act } from '@testing-library/react';
import { StrictMode } from 'react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import VoiceMode from './VoiceMode';
import { FakeRecognition, installSpeech, uninstallSpeech } from '../voiceTestUtils';

const makeChat = (reply = { ok: true, text: 'Hay un viaje el viernes **a las 3** con 600 kg libres.', attachments: [] }) => ({
  send: vi.fn(async () => reply),
  loading: false,
  messages: [],
});

const phase = () => screen.getByTestId('voice-phase').textContent;

describe('Chat de voz', () => {
  let speech;
  beforeEach(() => { speech = installSpeech(); });
  afterEach(() => uninstallSpeech());

  it('al abrir empieza a escuchar', () => {
    render(<VoiceMode chat={makeChat()} onClose={() => {}} />);
    expect(FakeRecognition.last.started).toBe(true);
    expect(phase()).toMatch(/te escucho/i);
  });

  it('lo que dices se envía al asistente en modo voz y la respuesta se lee en voz alta, sin markdown', async () => {
    const chat = makeChat();
    render(<VoiceMode chat={chat} onClose={() => {}} />);
    act(() => { FakeRecognition.last.say('¿qué viajes a La Paz hay el viernes?'); FakeRecognition.last.finish(); });

    await waitFor(() => expect(chat.send).toHaveBeenCalledWith('¿qué viajes a La Paz hay el viernes?', { voice: true }));
    await waitFor(() => expect(speech.spoken.length).toBeGreaterThan(0));
    const said = speech.spoken.map((u) => u.text).join(' ');
    expect(said).toContain('Hay un viaje el viernes a las 3 con 600 kilos libres');
    expect(said).not.toContain('*');
  });

  it('en desarrollo (React StrictMode monta dos veces) sigue escuchando y reintentando tras un silencio', async () => {
    render(<StrictMode><VoiceMode chat={makeChat()} onClose={() => {}} /></StrictMode>);
    expect(FakeRecognition.last.started).toBe(true);
    const first = FakeRecognition.last;
    act(() => first.finish()); // silencio: debe reintentar (esto fallaba si el montaje doble dejaba "desmontado")
    expect(FakeRecognition.last).not.toBe(first);
    expect(FakeRecognition.last.started).toBe(true);
  });

  it('manos libres: al terminar de hablar vuelve a escuchar', async () => {
    render(<VoiceMode chat={makeChat()} onClose={() => {}} />);
    const first = FakeRecognition.last;
    act(() => { first.say('hola'); first.finish(); });
    await waitFor(() => expect(FakeRecognition.instances.length).toBeGreaterThan(1));
    expect(FakeRecognition.last).not.toBe(first);
    expect(FakeRecognition.last.started).toBe(true);
  });

  it('con "manos libres" desactivado no vuelve a escuchar solo', async () => {
    render(<VoiceMode chat={makeChat()} onClose={() => {}} />);
    await userEvent.click(screen.getByRole('checkbox', { name: /manos libres/i }));
    const first = FakeRecognition.last;
    act(() => { first.say('hola'); first.finish(); });
    await waitFor(() => expect(speech.spoken.length).toBeGreaterThan(0));
    await new Promise((r) => setTimeout(r, 20));
    expect(FakeRecognition.instances.length).toBe(1);
  });

  it('un silencio vuelve a escuchar una vez; dos silencios seguidos detienen el manos libres y lo avisan', async () => {
    render(<VoiceMode chat={makeChat()} onClose={() => {}} />);
    const first = FakeRecognition.last;
    act(() => first.finish());                                   // silencio 1: se reintenta solo
    expect(FakeRecognition.last).not.toBe(first);
    expect(FakeRecognition.last.started).toBe(true);
    act(() => FakeRecognition.last.finish());                    // silencio 2: se rinde
    expect(await screen.findByText(/no te oí/i)).toBeInTheDocument();
    const count = FakeRecognition.instances.length;
    await new Promise((r) => setTimeout(r, 20));
    expect(FakeRecognition.instances.length).toBe(count);       // no sigue reintentando
  });

  it('si detienes la escucha a propósito no se reinicia sola', async () => {
    render(<VoiceMode chat={makeChat()} onClose={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /dejar de escuchar/i }));
    await new Promise((r) => setTimeout(r, 20));
    expect(FakeRecognition.instances.length).toBe(1);
    expect(FakeRecognition.last.started).toBe(false);
  });

  it('un error de micrófono no provoca reintentos en bucle', async () => {
    render(<VoiceMode chat={makeChat()} onClose={() => {}} />);
    act(() => FakeRecognition.last.fail('not-allowed'));
    await new Promise((r) => setTimeout(r, 20));
    expect(FakeRecognition.instances.length).toBe(1);
  });

  it('tocar el círculo mientras el asistente habla lo interrumpe y te escucha', async () => {
    speech = installSpeech({ autoEnd: false }); // la voz "sigue hablando"
    render(<VoiceMode chat={makeChat()} onClose={() => {}} />);
    act(() => { FakeRecognition.last.say('hola'); FakeRecognition.last.finish(); });
    await waitFor(() => expect(phase()).toMatch(/hablando/i));

    await userEvent.click(screen.getByRole('button', { name: /hablar/i }));
    expect(window.speechSynthesis.cancel).toHaveBeenCalled();
    expect(FakeRecognition.last.started).toBe(true);
  });

  it('muestra lo que vas diciendo mientras hablas', () => {
    render(<VoiceMode chat={makeChat()} onClose={() => {}} />);
    act(() => FakeRecognition.last.say('quiero saber si hay lugar', { final: false }));
    expect(screen.getByText(/quiero saber si hay lugar/)).toBeInTheDocument();
  });

  it('si el micrófono está bloqueado explica cómo permitirlo', () => {
    render(<VoiceMode chat={makeChat()} onClose={() => {}} />);
    act(() => FakeRecognition.last.fail('not-allowed'));
    expect(screen.getByRole('alert')).toHaveTextContent(/permiso para usar el micrófono/i);
  });

  it('una propuesta de acción recuerda que hay que confirmar con un clic y no se confirma por voz', async () => {
    const chat = makeChat({ ok: true, text: 'Preparé el paquete, confírmalo.', attachments: [{ kind: 'action_proposal', action: { id: 'x', title: 't', lines: [] } }] });
    chat.messages = [{ role: 'assistant', content: 'Preparé el paquete, confírmalo.', attachments: [{ kind: 'action_proposal', action: { id: 'x', title: 't', lines: [] } }] }];
    render(<VoiceMode chat={chat} onClose={() => {}} />);
    expect(screen.getByText(/acción esperando tu confirmación/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^confirmar$/i })).not.toBeInTheDocument();
  });

  it('salir corta el micrófono y la voz', async () => {
    const onClose = vi.fn();
    const { unmount } = render(<VoiceMode chat={makeChat()} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: /salir del chat de voz/i }));
    expect(onClose).toHaveBeenCalled();
    unmount();
    expect(FakeRecognition.last.started).toBe(false);
    expect(window.speechSynthesis.cancel).toHaveBeenCalled();
  });

  it('Escape también cierra', async () => {
    const onClose = vi.fn();
    render(<VoiceMode chat={makeChat()} onClose={onClose} />);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('el aviso de privacidad es visible', () => {
    render(<VoiceMode chat={makeChat()} onClose={() => {}} />);
    expect(screen.getByText(/servidores de google/i)).toBeInTheDocument();
  });
});

describe('Chat de voz en un navegador sin reconocimiento de voz', () => {
  beforeEach(() => installSpeech({ recognition: false }));
  afterEach(() => uninstallSpeech());

  it('lo dice con claridad y no ofrece un micrófono que no funciona', () => {
    render(<VoiceMode chat={makeChat()} onClose={() => {}} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/usa chrome o edge/i);
    expect(screen.queryByRole('button', { name: /hablar/i })).not.toBeInTheDocument();
  });
});
