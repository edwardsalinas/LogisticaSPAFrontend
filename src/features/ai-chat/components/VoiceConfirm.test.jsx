import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import VoiceMode from './VoiceMode';
import apiService from '../../../services/apiService';
import { FakeRecognition, installSpeech, uninstallSpeech } from '../voiceTestUtils';

vi.mock('../../../services/apiService', () => ({ default: { post: vi.fn() } }));
let mockGuided = null;
vi.mock('../guided/GuidedRunProvider', () => ({ useGuidedRun: () => mockGuided, canGuide: (a) => !!a?.ui?.fill?.values }));

const ACTION = {
  id: 'act-1', type: 'create_package', title: 'Registrar un paquete nuevo', lines: ['Ruta: La Paz → Oruro', 'Peso: 5 kg'],
  expires_at: new Date(Date.now() + 10 * 60_000).toISOString(), ui: { fill: { form: 'package', values: { origen: 'La Paz' } } },
};
const DELIVER = { id: 'act-2', type: 'deliver_package', title: 'Confirmar entrega', lines: ['Paquete: TRK-1'], expires_at: ACTION.expires_at };
// el conductor sí tiene datos para que Logi muestre la entrega («Que Logi lo haga»), pero por voz no se confirma
const DELIVER_GUIDABLE = { ...DELIVER, ui: { fill: { form: 'delivery', values: { items: [{ package_id: 'p1', tracking_code: 'TRK-1' }] } } } };

const makeChat = (action = ACTION, { shown = false } = {}) => ({
  send: vi.fn(async () => ({ ok: true, text: 'Preparé el registro del paquete.', attachments: [{ kind: 'action_proposal', action }] })),
  loading: false,
  // `shown`: la conversación ya incluye la respuesta con la propuesta (como ocurre en la app real tras enviar)
  messages: shown ? [{ role: 'assistant', content: 'Preparé el registro del paquete.', attachments: [{ kind: 'action_proposal', action }] }] : [],
  settleAction: vi.fn(),
});

/** El usuario dice algo y la escucha termina. */
const say = (text) => act(() => { FakeRecognition.last.say(text); FakeRecognition.last.finish(); });
const spoken = (speech) => speech.spoken.map((u) => u.text).join(' | ');

describe('Chat de voz: confirmar una acción diciendo «sí, hazlo»', () => {
  let speech;
  beforeEach(() => {
    speech = installSpeech();
    apiService.post.mockReset();
    mockGuided = { start: vi.fn().mockResolvedValue({ result: { result: { message: 'Paquete creado con el código TRK-9.' } } }) };
  });
  afterEach(() => uninstallSpeech());

  const askForAction = async (chat, props = {}) => {
    render(<VoiceMode chat={chat} onClose={props.onClose ?? (() => {})} />);
    say('crea un paquete de La Paz a Oruro de 5 kilos para María');
    await screen.findByText('Registrar un paquete nuevo'); // el panel con el resumen y los botones
  };

  it('lee el resumen del servidor y pregunta «¿lo hago?» sin ejecutar nada todavía', async () => {
    await askForAction(makeChat());
    await waitFor(() => expect(spoken(speech)).toMatch(/¿Lo hago\?/));
    const said = spoken(speech);
    expect(said).toContain('Registrar un paquete nuevo');
    expect(said).toContain('La Paz a Oruro');
    expect(said).not.toContain('Preparé el registro del paquete.'); // no se lee el texto del modelo (diría «pulsa Confirmar»)
    expect(screen.queryByText('Preparé el registro del paquete.')).not.toBeInTheDocument();
    expect(mockGuided.start).not.toHaveBeenCalled();
    expect(apiService.post).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /sí, hazlo/i })).toBeInTheDocument();
  });

  it('con «sí, hazlo» cierra el chat de voz y Logi lo hace en voz alta, igual que el botón de la tarjeta', async () => {
    const chat = makeChat();
    const onClose = vi.fn();
    await askForAction(chat, { onClose });
    await waitFor(() => expect(FakeRecognition.instances.length).toBeGreaterThan(1)); // vuelve a escuchar
    say('Sí, hazlo');

    await waitFor(() => expect(mockGuided.start).toHaveBeenCalledWith(ACTION, { aloud: true }));
    expect(onClose).toHaveBeenCalled();
    await waitFor(() => expect(chat.settleAction).toHaveBeenCalledWith('act-1', expect.objectContaining({ status: 'done' })));
    expect(apiService.post).not.toHaveBeenCalled(); // la confirmación la hace el motor, no el chat de voz
  });

  it('con «cancela» la cancela en el servidor y no hace nada', async () => {
    apiService.post.mockResolvedValue({ result: { message: 'Acción cancelada. No se hizo ningún cambio.' } });
    const chat = makeChat();
    await askForAction(chat);
    await waitFor(() => expect(FakeRecognition.instances.length).toBeGreaterThan(1));
    say('cancela');

    await waitFor(() => expect(apiService.post).toHaveBeenCalledWith('/ai-agent/actions/act-1/cancel'));
    expect(mockGuided.start).not.toHaveBeenCalled();
    await waitFor(() => expect(chat.settleAction).toHaveBeenCalledWith('act-1', expect.objectContaining({ status: 'cancelled' })));
    await waitFor(() => expect(spoken(speech)).toMatch(/no hice ningún cambio/i));
    expect(screen.queryByText('Registrar un paquete nuevo')).not.toBeInTheDocument();
  });

  it('una frase con duda NO ejecuta: «sí, pero cambia el peso» se vuelve a preguntar, y a la segunda deja la acción pendiente', async () => {
    await askForAction(makeChat());
    await waitFor(() => expect(FakeRecognition.instances.length).toBeGreaterThan(1));
    say('sí hazlo pero cambia el peso a siete kilos');
    await waitFor(() => expect(spoken(speech)).toMatch(/No te entendí/));
    expect(mockGuided.start).not.toHaveBeenCalled();

    await waitFor(() => expect(FakeRecognition.instances.length).toBeGreaterThan(2));
    say('quiero otra cosa');
    await waitFor(() => expect(screen.getByText(/dejé la acción pendiente/i)).toBeInTheDocument());
    expect(mockGuided.start).not.toHaveBeenCalled();
    expect(apiService.post).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /sí, hazlo/i })).not.toBeInTheDocument();
  });

  it('también se puede con los botones (sin hablar)', async () => {
    await askForAction(makeChat());
    await userEvent.click(screen.getByRole('button', { name: /sí, hazlo/i }));
    await waitFor(() => expect(mockGuided.start).toHaveBeenCalledWith(ACTION, { aloud: true }));
  });

  it('si la propuesta ya venció, no la ejecuta y lo dice', async () => {
    await askForAction(makeChat({ ...ACTION, expires_at: new Date(Date.now() - 1000).toISOString() }));
    await userEvent.click(screen.getByRole('button', { name: /sí, hazlo/i }));
    await waitFor(() => expect(spoken(speech)).toMatch(/ya venció/));
    expect(mockGuided.start).not.toHaveBeenCalled();
  });

  it('sin manos libres no hay confirmación por voz (no volvería a escuchar el «sí»): queda el botón de la tarjeta', async () => {
    const chat = makeChat(ACTION, { shown: true });
    render(<VoiceMode chat={chat} onClose={() => {}} />);
    await userEvent.click(screen.getByRole('checkbox', { name: /manos libres/i }));
    say('crea un paquete');
    await screen.findByText(/hay una acción esperando tu confirmación/i);
    expect(screen.queryByRole('button', { name: /sí, hazlo/i })).not.toBeInTheDocument();
  });

  it('una entrega (o cualquier acción que Logi no muestra) sigue exigiendo el clic en la tarjeta', async () => {
    render(<VoiceMode chat={makeChat(DELIVER, { shown: true })} onClose={() => {}} />);
    say('entrega el paquete TRK-1');
    await screen.findByText(/hay una acción esperando tu confirmación/i);
    expect(screen.queryByRole('button', { name: /sí, hazlo/i })).not.toBeInTheDocument();
    expect(spoken(speech)).not.toMatch(/¿Lo hago\?/);
  });

  it('una entrega, aunque Logi sepa mostrarla, NO se confirma por voz: queda el clic en la tarjeta', async () => {
    render(<VoiceMode chat={makeChat(DELIVER_GUIDABLE, { shown: true })} onClose={() => {}} />);
    say('entrega el paquete TRK-1');
    await screen.findByText(/hay una acción esperando tu confirmación/i);
    expect(screen.queryByRole('button', { name: /sí, hazlo/i })).not.toBeInTheDocument();
    expect(spoken(speech)).not.toMatch(/¿Lo hago\?/);
    expect(mockGuided.start).not.toHaveBeenCalled();
  });

  it('fuera del layout (sin Logi) todo sigue como antes', async () => {
    mockGuided = null;
    render(<VoiceMode chat={makeChat(ACTION, { shown: true })} onClose={() => {}} />);
    say('crea un paquete');
    await screen.findByText(/hay una acción esperando tu confirmación/i);
    expect(screen.queryByRole('button', { name: /sí, hazlo/i })).not.toBeInTheDocument();
  });
});

describe('Chat de voz: acciones sin coreografía (asignar conductor y crear un viaje) se confirman directamente', () => {
  let speech;
  const DRIVER = { id: 'act-d', type: 'assign_driver', title: 'Asignar conductor a un viaje', lines: ['Viaje: Oruro → La Paz', 'Conductor: Juan Pérez'], expires_at: new Date(Date.now() + 10 * 60_000).toISOString() };
  const TRIP = { id: 'act-t', type: 'create_trip', title: 'Crear un viaje', lines: ['Trayecto: Oruro → La Paz'], expires_at: DRIVER.expires_at };
  const CANCEL = { id: 'act-c', type: 'cancel_package', title: 'Anular un paquete', lines: ['Paquete: TRK-1'], expires_at: DRIVER.expires_at };

  beforeEach(() => {
    speech = installSpeech();
    apiService.post.mockReset();
    mockGuided = { start: vi.fn() };
  });
  afterEach(() => uninstallSpeech());

  it('lee el resumen y, con «sí, hazlo», confirma en el servidor y dice el resultado, sin cerrar el chat de voz', async () => {
    apiService.post.mockResolvedValue({ success: true, result: { message: 'Conductor asignado al viaje.' } });
    const chat = makeChat(DRIVER);
    const onClose = vi.fn();
    render(<VoiceMode chat={chat} onClose={onClose} />);
    say('asigna a Juan Pérez al viaje de Oruro a La Paz');
    await waitFor(() => expect(spoken(speech)).toMatch(/¿Lo hago\?/));
    expect(spoken(speech)).toContain('Conductor: Juan Pérez');
    expect(apiService.post).not.toHaveBeenCalled(); // preguntar no ejecuta nada
    await waitFor(() => expect(FakeRecognition.instances.length).toBeGreaterThan(1));
    say('sí, hazlo');

    await waitFor(() => expect(apiService.post).toHaveBeenCalledWith('/ai-agent/actions/act-d/confirm'));
    await waitFor(() => expect(spoken(speech)).toMatch(/Conductor asignado al viaje/));
    await waitFor(() => expect(chat.settleAction).toHaveBeenCalledWith('act-d', expect.objectContaining({ status: 'done' })));
    expect(mockGuided.start).not.toHaveBeenCalled(); // no hay coreografía
    expect(onClose).not.toHaveBeenCalled(); // la pantalla no hace falta: el chat de voz sigue para la siguiente orden
  });

  it('crear un viaje también se confirma por voz', async () => {
    apiService.post.mockResolvedValue({ success: true, result: { message: 'Viaje creado.' } });
    render(<VoiceMode chat={makeChat(TRIP)} onClose={() => {}} />);
    say('crea un viaje de Oruro a La Paz para mañana a las 8');
    await waitFor(() => expect(spoken(speech)).toMatch(/¿Lo hago\?/));
    await waitFor(() => expect(FakeRecognition.instances.length).toBeGreaterThan(1));
    say('sí');
    await waitFor(() => expect(apiService.post).toHaveBeenCalledWith('/ai-agent/actions/act-t/confirm'));
  });

  it('con «cancela» no confirma: cancela la propuesta', async () => {
    apiService.post.mockResolvedValue({ result: { message: 'Acción cancelada.' } });
    render(<VoiceMode chat={makeChat(DRIVER)} onClose={() => {}} />);
    say('asigna a Juan Pérez al viaje de Oruro a La Paz');
    await waitFor(() => expect(spoken(speech)).toMatch(/¿Lo hago\?/));
    await waitFor(() => expect(FakeRecognition.instances.length).toBeGreaterThan(1));
    say('cancela');
    await waitFor(() => expect(apiService.post).toHaveBeenCalledWith('/ai-agent/actions/act-d/cancel'));
    expect(apiService.post).not.toHaveBeenCalledWith('/ai-agent/actions/act-d/confirm');
  });

  it('una duda («sí, pero cambia el conductor») NO ejecuta nada', async () => {
    render(<VoiceMode chat={makeChat(DRIVER)} onClose={() => {}} />);
    say('asigna a Juan Pérez al viaje de Oruro a La Paz');
    await waitFor(() => expect(spoken(speech)).toMatch(/¿Lo hago\?/));
    await waitFor(() => expect(FakeRecognition.instances.length).toBeGreaterThan(1));
    say('sí pero cambia el conductor por otro');
    await waitFor(() => expect(spoken(speech)).toMatch(/No te entendí/));
    expect(apiService.post).not.toHaveBeenCalled();
  });

  it('si el servidor rechaza (por ejemplo, el conductor ya va en tránsito), Logi lo dice y no marca la acción como hecha', async () => {
    apiService.post.mockRejectedValue(Object.assign(new Error('El viaje ya no está planeado'), { status: 409 }));
    const chat = makeChat(DRIVER);
    render(<VoiceMode chat={chat} onClose={() => {}} />);
    say('asigna a Juan Pérez al viaje de Oruro a La Paz');
    await waitFor(() => expect(spoken(speech)).toMatch(/¿Lo hago\?/));
    await waitFor(() => expect(FakeRecognition.instances.length).toBeGreaterThan(1));
    say('sí, hazlo');
    await waitFor(() => expect(spoken(speech)).toMatch(/No pude hacerlo/));
    expect(spoken(speech)).toMatch(/ya no está planeado/);
    expect(chat.settleAction).not.toHaveBeenCalled();
  });

  it('anular un paquete NO se confirma por voz (no se puede deshacer): queda el clic en la tarjeta', async () => {
    render(<VoiceMode chat={makeChat(CANCEL, { shown: true })} onClose={() => {}} />);
    say('anula el paquete TRK-1');
    await screen.findByText(/hay una acción esperando tu confirmación/i);
    expect(screen.queryByRole('button', { name: /sí, hazlo/i })).not.toBeInTheDocument();
    expect(spoken(speech)).not.toMatch(/¿Lo hago\?/);
    expect(apiService.post).not.toHaveBeenCalled();
  });
});
