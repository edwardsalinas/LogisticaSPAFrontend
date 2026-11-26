import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GuidedRunProvider, canGuide, useGuidedRun } from './GuidedRunProvider';
import { GUIDED_EVENTS, registerGuidedForm } from './guidedForms';
import apiService from '../../../services/apiService';

vi.mock('../../../services/apiService', () => ({ default: { post: vi.fn(), trackLogiEvent: vi.fn() } }));
// «reducir movimiento»: todo ocurre al instante (sin esperas) y no hace falta layout real
vi.mock('../voice', async (original) => ({ ...(await original()), prefersReducedMotion: () => true }));
vi.mock('../useVoice', () => ({ useSpeechSynthesis: () => ({ supported: false, speaking: false, speak: vi.fn(), cancel: vi.fn() }) }));

const ACTION = {
  id: 'act-1', type: 'create_package', title: 'Registrar un paquete nuevo', lines: [],
  ui: { fill: { form: 'package', values: { origen: 'La Paz', destino: 'Oruro', peso: 5, recipient_name: 'María López' } } },
};

let out;
let startOptions;
function Starter({ action = ACTION }) {
  const guided = useGuidedRun();
  return <button onClick={async () => { out = await guided.start(action, startOptions); }}>empezar</button>;
}
const renderApp = (onBegin = vi.fn(), action) => render(
  <MemoryRouter><GuidedRunProvider onBegin={onBegin}><Starter action={action} /></GuidedRunProvider></MemoryRouter>,
);

// formulario falso: ya «abierto», con un elemento por campo
const fakeForm = () => {
  const setValue = vi.fn();
  const els = {};
  const getElement = (name) => (els[name] ??= Object.assign(document.body.appendChild(document.createElement('input')), { name }));
  const off = registerGuidedForm('package', { isReady: () => true, setValue, getElement });
  return { setValue, off, els };
};

describe('Logi guiado: motor de ejecución', () => {
  let form;
  const events = [];
  const onEvent = (e) => events.push(e.type);
  beforeEach(() => {
    apiService.post.mockReset(); apiService.trackLogiEvent.mockReset(); out = undefined; startOptions = undefined; events.length = 0;
    form = fakeForm();
    Object.values(GUIDED_EVENTS).forEach((n) => window.addEventListener(n, onEvent));
  });
  afterEach(() => { form.off(); Object.values(GUIDED_EVENTS).forEach((n) => window.removeEventListener(n, onEvent)); });

  it('canGuide: solo acciones con coreografía y con datos para llenar', () => {
    expect(canGuide(ACTION)).toBe(true);
    expect(canGuide({ ...ACTION, ui: undefined })).toBe(false);
    expect(canGuide({ ...ACTION, type: 'deliver_package' })).toBe(false);
  });

  it('llena los campos y confirma la propuesta UNA sola vez (solo ahí cambian los datos)', async () => {
    apiService.post.mockResolvedValue({ success: true, result: { message: 'Paquete creado con el código TRK-9.' } });
    const onBegin = vi.fn();
    renderApp(onBegin);
    await userEvent.click(screen.getByText('empezar'));
    await waitFor(() => expect(out).toBeDefined(), { timeout: 5000 });

    expect(onBegin).toHaveBeenCalledTimes(1); // el panel se cierra para dejar el escenario libre
    const campos = form.setValue.mock.calls.map((c) => c[0]);
    expect(campos).toEqual(expect.arrayContaining(['origen', 'destino', 'recipient_name', 'peso']));
    expect(form.setValue).toHaveBeenCalledWith('origen', 'La Paz');
    expect(apiService.post).toHaveBeenCalledTimes(1);
    expect(apiService.post).toHaveBeenCalledWith('/ai-agent/actions/act-1/confirm');
    expect(out.result.result.message).toMatch(/TRK-9/);
    expect(events).toContain(GUIDED_EVENTS.changed); // la página refresca su lista
    // todo vuelve a la normalidad: el aviso se quita en un redibujado POSTERIOR a que termina la acción, así que se espera
    // (comprobarlo al instante competía con React y fallaba con la máquina cargada)
    await waitFor(() => expect(screen.queryByText(/trabajando por ti/i)).not.toBeInTheDocument());
  });

  it('«Enséñame» (demo): hace todo lo visible pero NO confirma ni guarda nada, y la acción sigue pendiente', async () => {
    startOptions = { demo: true };
    renderApp();
    await userEvent.click(screen.getByText('empezar'));
    await waitFor(() => expect(out).toBeDefined(), { timeout: 5000 });

    expect(out.result).toEqual({ demo: true });
    expect(form.setValue).toHaveBeenCalledWith('origen', 'La Paz'); // sí llenó el formulario
    expect(apiService.post).not.toHaveBeenCalled(); // pero no confirmó nada
    expect(events).toContain(GUIDED_EVENTS.cancelForm); // y cerró el formulario
    expect(events).not.toContain(GUIDED_EVENTS.changed); // sin recargar datos: no cambió nada
  });

  it('métricas: anota que empezó y que terminó (solo el evento y el tipo)', async () => {
    apiService.post.mockResolvedValue({ success: true, result: { message: 'Paquete creado con el código TRK-9.' } });
    renderApp();
    await userEvent.click(screen.getByText('empezar'));
    await waitFor(() => expect(out).toBeDefined(), { timeout: 5000 });
    expect(apiService.trackLogiEvent.mock.calls.map((c) => c[0])).toEqual([
      { event: 'guided_started', type: 'create_package' },
      { event: 'guided_done', type: 'create_package' },
    ]);
  });

  it('métricas: una demostración cuenta como demo_done (no como acción hecha) y detener cuenta como detenida', async () => {
    startOptions = { demo: true };
    renderApp();
    await userEvent.click(screen.getByText('empezar'));
    await waitFor(() => expect(out).toBeDefined(), { timeout: 5000 });
    expect(apiService.trackLogiEvent.mock.calls.map((c) => c[0])).toEqual([{ event: 'demo_done', type: 'create_package' }]);

    out = undefined; startOptions = undefined; apiService.trackLogiEvent.mockReset(); form.off();
    renderApp();
    await userEvent.click(screen.getAllByText('empezar').at(-1));
    await userEvent.click(await screen.findByRole('button', { name: /^detener$/i }));
    await waitFor(() => expect(out).toBeDefined(), { timeout: 5000 });
    expect(apiService.trackLogiEvent.mock.calls.map((c) => c[0].event)).toEqual(['guided_started', 'guided_stopped']);
  });

  it('si la acción real falla, devuelve el error y no la repite', async () => {
    apiService.post.mockRejectedValue(new Error('El viaje ya está lleno'));
    renderApp();
    await userEvent.click(screen.getByText('empezar'));
    await waitFor(() => expect(out).toBeDefined(), { timeout: 5000 });
    expect(out.error.message).toBe('El viaje ya está lleno');
    expect(apiService.post).toHaveBeenCalledTimes(1);
  });

  it('si la pantalla no responde, registra directamente en vez de dejar la tarea sin hacer', async () => {
    form.off(); // no hay formulario ni botón «Nuevo»: la pantalla no responde
    apiService.post.mockResolvedValue({ success: true, result: { message: 'Paquete creado con el código TRK-8.' } });
    renderApp();
    await userEvent.click(screen.getByText('empezar'));
    await waitFor(() => expect(out).toBeDefined(), { timeout: 15000 });
    expect(out.result.result.message).toMatch(/TRK-8/);
    expect(apiService.post).toHaveBeenCalledTimes(1);
    expect(events).toContain(GUIDED_EVENTS.cancelForm); // y el formulario a medias se cierra
  }, 20000);

  it('«Detener» corta a Logi: no se ejecuta nada y el formulario a medias se cierra', async () => {
    form.off(); // Logi queda esperando la pantalla: da tiempo a detenerlo
    renderApp();
    await userEvent.click(screen.getByText('empezar'));
    await userEvent.click(await screen.findByRole('button', { name: /^detener$/i }));
    await waitFor(() => expect(out).toBeDefined());
    expect(out.stopped).toBe(true);
    expect(apiService.post).not.toHaveBeenCalled();
    expect(events).toContain(GUIDED_EVENTS.cancelForm);
    expect(screen.queryByText(/trabajando por ti/i)).not.toBeInTheDocument();
  });

  it('Escape también lo detiene', async () => {
    form.off();
    renderApp();
    await userEvent.click(screen.getByText('empezar'));
    await screen.findByText(/trabajando por ti/i);
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(out).toBeDefined());
    expect(out.stopped).toBe(true);
    expect(apiService.post).not.toHaveBeenCalled();
  });

  it('una acción sin coreografía devuelve error y no ejecuta nada', async () => {
    renderApp(vi.fn(), { ...ACTION, type: 'deliver_package' });
    await userEvent.click(screen.getByText('empezar'));
    await waitFor(() => expect(out).toBeDefined());
    expect(out.error).toBeInstanceOf(Error);
    expect(apiService.post).not.toHaveBeenCalled();
  });
});
