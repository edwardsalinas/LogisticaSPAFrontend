import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AssistantHome from './AssistantHome';
import AiAssistantPanel from '../components/AiAssistantPanel';
import { AssistantChatProvider } from '../AssistantChatProvider';
import { AvailableTripsCard, FleetAvailabilityCard } from '../components/AssistantCards';
import apiService from '../../../services/apiService';
import { FakeRecognition, installSpeech, uninstallSpeech } from '../voiceTestUtils';

let mockUser;
vi.mock('../../../app/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
vi.mock('../../../services/apiService', () => ({ default: { post: vi.fn() } }));

const ADMIN = { id: 'u1', email: 'admin@logistica.bo', user_metadata: { full_name: 'Carlos Mendoza' }, app_metadata: { role: 'admin' } };
const wrap = (ui) => render(<MemoryRouter><AssistantChatProvider>{ui}</AssistantChatProvider></MemoryRouter>);
const type = async (text) => {
  await userEvent.type(screen.getByLabelText(/mensaje para el asistente/i), text);
  await userEvent.click(screen.getByRole('button', { name: /^enviar$/i }));
};

describe('Micrófono y voz en la pantalla del asistente', () => {
  beforeEach(() => { apiService.post.mockReset(); mockUser = ADMIN; window.localStorage.clear(); });
  afterEach(() => uninstallSpeech());

  it('sin reconocimiento de voz no hay botón de micrófono, pero el chat de voz explica por qué', async () => {
    installSpeech({ recognition: false });
    wrap(<AssistantHome />);
    expect(screen.queryByRole('button', { name: /dictar con el micrófono/i })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /abrir el chat de voz/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/usa chrome o edge/i);
  });

  it('dictar: lo que dices se envía como pregunta', async () => {
    installSpeech();
    apiService.post.mockResolvedValue({ response: 'Hay dos viajes.', attachments: [] });
    wrap(<AssistantHome />);
    await userEvent.click(screen.getByRole('button', { name: /dictar con el micrófono/i }));
    act(() => { FakeRecognition.last.say('qué viajes hay el viernes'); FakeRecognition.last.finish(); });

    await waitFor(() => expect(apiService.post).toHaveBeenCalledWith('/ai-agent/chat', { message: 'qué viajes hay el viernes', history: [], context: expect.any(Object) }));
    expect(await screen.findByText('Hay dos viajes.')).toBeInTheDocument();
  });

  it('"leer las respuestas" se recuerda y hace que la respuesta se escuche', async () => {
    const speech = installSpeech();
    apiService.post.mockResolvedValue({ response: 'El viaje sale a las **tres** de la tarde.', attachments: [] });
    wrap(<AssistantHome />);
    const toggle = screen.getByRole('switch', { name: /leer las respuestas en voz alta/i });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(window.localStorage.getItem('logistica:ai-speak-replies')).toBe('1');

    await type('hola');
    await waitFor(() => expect(speech.spoken.length).toBeGreaterThan(0));
    expect(speech.spoken.map((u) => u.text).join(' ')).toContain('El viaje sale a las tres de la tarde');
  });

  it('con la lectura desactivada la respuesta no se lee', async () => {
    const speech = installSpeech();
    apiService.post.mockResolvedValue({ response: 'Respuesta', attachments: [] });
    wrap(<AssistantHome />);
    await type('hola');
    await screen.findByText('Respuesta');
    expect(speech.spoken.length).toBe(0);
  });

  it('el botón de auriculares abre el chat de voz y empieza a escuchar', async () => {
    installSpeech();
    wrap(<AssistantHome />);
    await userEvent.click(screen.getByRole('button', { name: /abrir el chat de voz/i }));
    expect(screen.getByRole('dialog', { name: /chat de voz/i })).toBeInTheDocument();
    expect(FakeRecognition.last.started).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: /salir del chat de voz/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('Conversación compartida entre pantallas', () => {
  beforeEach(() => { apiService.post.mockReset(); mockUser = ADMIN; });

  it('lo hablado en el panel flotante aparece en la pantalla del asistente al cambiar de pantalla', async () => {
    apiService.post.mockResolvedValue({ response: 'Respuesta compartida', attachments: [] });
    const app = (page) => <MemoryRouter><AssistantChatProvider>{page}</AssistantChatProvider></MemoryRouter>;
    const { rerender } = render(app(<AiAssistantPanel role="admin" />));
    await type('primera pregunta');
    await screen.findByText('Respuesta compartida');

    // el usuario cambia de pantalla: el panel desaparece y aparece la vista del asistente, con el MISMO proveedor
    rerender(app(<AssistantHome />));
    expect(screen.getByText('primera pregunta')).toBeInTheDocument();
    expect(screen.getByText('Respuesta compartida')).toBeInTheDocument();
  });

  it('el contexto de la conversación se envía en la pregunta siguiente', async () => {
    apiService.post
      .mockResolvedValueOnce({ response: 'Hay un viaje el viernes.', attachments: [] })
      .mockResolvedValueOnce({ response: 'Sí, hay espacio.', attachments: [] });
    wrap(<AssistantHome />);
    await type('¿qué viajes hay el viernes?');
    await screen.findByText('Hay un viaje el viernes.');
    await type('¿y tiene espacio?');
    await screen.findByText('Sí, hay espacio.');
    expect(apiService.post).toHaveBeenLastCalledWith('/ai-agent/chat', {
      message: '¿y tiene espacio?',
      history: [{ role: 'user', content: '¿qué viajes hay el viernes?' }, { role: 'assistant', content: 'Hay un viaje el viernes.' }],
      context: expect.any(Object),
    });
  });

  it('al cambiar de usuario la conversación se borra (otra persona en el mismo navegador no la ve)', async () => {
    apiService.post.mockResolvedValue({ response: 'Respuesta privada', attachments: [] });
    const { rerender } = wrap(<AssistantHome />);
    await type('algo privado');
    await screen.findByText('Respuesta privada');

    mockUser = { ...ADMIN, id: 'otra-persona' };
    rerender(<MemoryRouter><AssistantChatProvider><AssistantHome /></AssistantChatProvider></MemoryRouter>);
    await waitFor(() => expect(screen.queryByText('Respuesta privada')).not.toBeInTheDocument());
    expect(screen.queryByText('algo privado')).not.toBeInTheDocument();
  });

  it('"Nueva conversación" vacía la conversación compartida', async () => {
    apiService.post.mockResolvedValue({ response: 'Algo', attachments: [] });
    wrap(<AssistantHome />);
    await type('hola');
    await screen.findByText('Algo');
    await userEvent.click(screen.getByRole('button', { name: /nueva conversación/i }));
    expect(screen.queryByText('Algo')).not.toBeInTheDocument();
  });
});

describe('Tarjetas de disponibilidad', () => {
  const trip = { ref: 'RT-A', origin: 'Oruro', destination: 'La Paz', departure_time: '2026-11-27T19:30:00Z', estimated_arrival: '2026-11-27T23:00:00Z', vehicle: 'ABC-123 Volvo FH16', capacity_kg: 1000, used_kg: 400, free_kg: 600, fits: true };

  it('muestra los viajes con el espacio libre y deja agendar solo al personal', async () => {
    const onAsk = vi.fn();
    const { unmount } = render(<AvailableTripsCard data={{ kind: 'available_trips', query: { date: '2026-11-27', from_time: '15:00', to_time: '17:00', destination: 'La Paz', weight_kg: 20 }, trips: [trip], alternatives: [], can_schedule: true }} onAsk={onAsk} />);
    expect(screen.getByText(/viajes disponibles a la paz/i)).toBeInTheDocument();
    expect(screen.getByText(/600 kg libres/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /agendar un paquete aquí/i }));
    expect(onAsk).toHaveBeenCalledWith('Quiero agendar un paquete de 20 kg en el viaje RT-A');
    unmount();

    render(<AvailableTripsCard data={{ kind: 'available_trips', query: {}, trips: [trip], alternatives: [], can_schedule: false }} />);
    expect(screen.queryByRole('button', { name: /agendar/i })).not.toBeInTheDocument(); // un cliente solo consulta
  });

  it('un viaje al que no cabe el paquete se marca y no ofrece agendar', () => {
    render(<AvailableTripsCard data={{ kind: 'available_trips', query: {}, trips: [{ ...trip, free_kg: 10, fits: false }], alternatives: [], can_schedule: true }} />);
    expect(screen.getByText(/no cabe/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /agendar/i })).not.toBeInTheDocument();
  });

  it('sin viajes en el horario muestra los más cercanos', () => {
    render(<AvailableTripsCard data={{ kind: 'available_trips', query: { date: '2026-11-27' }, trips: [], alternatives: [{ ...trip, ref: 'RT-ALT' }], can_schedule: false }} />);
    expect(screen.getByText(/no hay viajes en ese horario/i)).toBeInTheDocument();
    expect(screen.getByText(/los más cercanos/i)).toBeInTheDocument();
    expect(screen.getByText(/oruro → la paz/i)).toBeInTheDocument();
  });

  it('flota libre y ocupada en el horario', () => {
    render(<FleetAvailabilityCard data={{ kind: 'fleet_availability', window: { date: '2026-11-27', from_time: '15:00', to_time: '17:00' }, vehicles_free: [{ plate: 'XYZ-789', vehicle: 'XYZ-789 Mercedes Sprinter' }], vehicles_busy: [{ plate: 'ABC-123', vehicle: 'ABC-123 Volvo' }], drivers_free: [{ name: 'Ana' }], drivers_busy: [] }} />);
    expect(screen.getByText(/vehículos libres \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText('XYZ-789 Mercedes Sprinter')).toBeInTheDocument();
    expect(screen.getByText(/vehículos ocupados \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/conductores ocupados \(0\)/i)).toBeInTheDocument();
  });
});
