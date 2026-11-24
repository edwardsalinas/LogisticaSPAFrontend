import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GuidedRunProvider, canGuide, useGuidedRun } from './GuidedRunProvider';
import { GUIDED_EVENTS, registerGuidedForm } from './guidedForms';
import apiService from '../../../services/apiService';

vi.mock('../../../services/apiService', () => ({ default: { post: vi.fn() } }));
// «reducir movimiento»: todo ocurre al instante; jsdom no calcula posiciones, así que se simula que todo es visible
vi.mock('../voice', async (original) => ({ ...(await original()), prefersReducedMotion: () => true }));
vi.mock('../useVoice', () => ({ useSpeechSynthesis: () => ({ supported: false, speaking: false, speak: vi.fn(), cancel: vi.fn() }) }));

const ASSIGN = (items) => ({
  id: 'asg-1', type: 'assign_package', title: 'Asignar paquetes', lines: [],
  ui: { fill: { form: 'assignment', values: { route_id: 'route-9', route_text: 'La Paz → Oruro', items: items.map((c) => ({ package_id: `id-${c}`, tracking_code: c })) } } },
});
const EVENT = (items = [{ package_id: 'id-1', tracking_code: 'TRK-1', lat: -16.5, lng: -68.1 }]) => ({
  id: 'evt-1', type: 'register_tracking_event', title: 'Registrar evento', lines: [],
  ui: { fill: { form: 'event', values: { status: 'en_agencia', observations: 'Lote 7', items } } },
});

const DELIVER = (codes, note = 'Recibió Ana') => ({
  id: 'del-1', type: 'deliver_package', title: 'Confirmar entrega', lines: [],
  ui: { fill: { form: 'delivery', values: { note, items: codes.map((c) => ({ package_id: `id-${c}`, tracking_code: c })) } } },
});

let out;
function Starter({ action }) {
  const guided = useGuidedRun();
  return <button onClick={async () => { out = await guided.start(action); }}>empezar</button>;
}
const renderApp = (action) => render(<MemoryRouter><GuidedRunProvider><Starter action={action} /></GuidedRunProvider></MemoryRouter>);

const input = (name) => Object.assign(document.body.appendChild(document.createElement('input')), { name });

describe('Logi guiado, fase 2: topes de paquetes', () => {
  it('asignar se muestra con 1 a 3 paquetes; con más, solo el botón de siempre', () => {
    expect(canGuide(ASSIGN(['A']))).toBe(true);
    expect(canGuide(ASSIGN(['A', 'B', 'C']))).toBe(true);
    expect(canGuide(ASSIGN(['A', 'B', 'C', 'D']))).toBe(false);
  });

  it('el evento se muestra con un solo paquete', () => {
    expect(canGuide(EVENT())).toBe(true);
    expect(canGuide(EVENT([{ package_id: 'a', tracking_code: 'A' }, { package_id: 'b', tracking_code: 'B' }]))).toBe(false);
    expect(canGuide({ ...EVENT(), ui: { fill: { form: 'event', values: { status: 'x' } } } })).toBe(false); // sin lista de paquetes
  });
});

describe('Logi guiado: entregar', () => {
  it('se muestra con 1 a 3 paquetes; con más, solo el botón de siempre', () => {
    expect(canGuide(DELIVER(['A']))).toBe(true);
    expect(canGuide(DELIVER(['A', 'B', 'C']))).toBe(true);
    expect(canGuide(DELIVER(['A', 'B', 'C', 'D']))).toBe(false);
  });
});

describe('Logi guiado, fase 2: coreografías', () => {
  const events = [];
  const onEvent = (e) => events.push(e.type);
  let proto;
  beforeEach(() => {
    apiService.post.mockReset(); out = undefined; events.length = 0;
    proto = Element.prototype.getClientRects;
    Element.prototype.getClientRects = () => [{}]; // todo «visible»
    Object.values(GUIDED_EVENTS).forEach((n) => window.addEventListener(n, onEvent));
  });
  afterEach(() => {
    Element.prototype.getClientRects = proto;
    Object.values(GUIDED_EVENTS).forEach((n) => window.removeEventListener(n, onEvent));
    document.body.querySelectorAll('input, select, button[data-logi-vincular]').forEach((e) => e.remove());
  });

  it('asignar: por cada paquete pulsa «Vincular», elige el viaje y al final confirma UNA vez para todos', async () => {
    apiService.post.mockResolvedValue({ success: true, result: { message: 'Asignados 2 de 2 paquetes al viaje.' } });
    const picks = [];
    let off = null;
    // simula la página: «Vincular» abre el formulario de asignación; cancelar/cambiar lo cierra
    ['TRK-1', 'TRK-2'].forEach((code) => {
      const b = Object.assign(document.createElement('button'), { textContent: 'Vincular' });
      b.setAttribute('data-logi-vincular', code);
      b.addEventListener('click', () => {
        const select = Object.assign(document.createElement('select'), { name: 'routeId' });
        select.add(new Option('La Paz → Oruro', 'route-9'));
        document.body.appendChild(select);
        off = registerGuidedForm('assignment', { isReady: () => true, setValue: (n, v) => picks.push([code, n, v]), getElement: () => select });
      });
      document.body.appendChild(b);
    });
    window.addEventListener(GUIDED_EVENTS.cancelForm, () => { off?.(); off = null; });

    renderApp(ASSIGN(['TRK-1', 'TRK-2']));
    await userEvent.click(screen.getByText('empezar'));
    await waitFor(() => expect(out).toBeDefined(), { timeout: 8000 });

    expect(picks).toEqual([['TRK-1', 'routeId', 'route-9'], ['TRK-2', 'routeId', 'route-9']]);
    expect(apiService.post).toHaveBeenCalledTimes(1);
    expect(apiService.post).toHaveBeenCalledWith('/ai-agent/actions/asg-1/confirm');
    expect(events).toContain(GUIDED_EVENTS.changed);
    off?.();
  }, 15000);

  it('registrar evento: elige paquete, estado y ubicación y confirma UNA vez', async () => {
    apiService.post.mockResolvedValue({ success: true, result: { message: 'Evento registrado.' } });
    const set = vi.fn();
    const off = registerGuidedForm('event', {
      setValue: set,
      getElement: (name) => document.querySelector(`[name="${name}"]`) ?? input(name),
    });

    renderApp(EVENT());
    await userEvent.click(screen.getByText('empezar'));
    await waitFor(() => expect(out).toBeDefined(), { timeout: 8000 });

    expect(set).toHaveBeenCalledWith('package_id', 'id-1');
    expect(set).toHaveBeenCalledWith('status', 'en_agencia');
    expect(set).toHaveBeenCalledWith('lat', '-16.5');
    expect(set).toHaveBeenCalledWith('lng', '-68.1');
    expect(apiService.post).toHaveBeenCalledTimes(1);
    expect(apiService.post).toHaveBeenCalledWith('/ai-agent/actions/evt-1/confirm');
    expect(events).toContain(GUIDED_EVENTS.changed);
    off();
  }, 15000);

  it('entregar: pulsa «Entregar», escribe la nota y «pulsa» Confirmar entrega; confirma UNA vez', async () => {
    apiService.post.mockResolvedValue({ success: true, result: { message: 'Paquete TRK-1 marcado como entregado.' } });
    const typed = [];
    let off = null;
    const b = Object.assign(document.createElement('button'), { textContent: 'Entregar' });
    b.setAttribute('data-logi-entregar', 'TRK-1');
    b.addEventListener('click', () => {
      const note = Object.assign(document.createElement('textarea'), { name: 'note' });
      const submit = Object.assign(document.createElement('button'), { textContent: 'Confirmar entrega' });
      document.body.append(note, submit);
      off = registerGuidedForm('delivery', { isReady: () => true, setValue: (n, v) => typed.push([n, v]), getElement: (n) => (n === 'submit' ? submit : note) });
    });
    document.body.appendChild(b);

    renderApp(DELIVER(['TRK-1']));
    await userEvent.click(screen.getByText('empezar'));
    await waitFor(() => expect(out).toBeDefined(), { timeout: 8000 });

    expect(typed.at(-1)).toEqual(['note', 'Recibió Ana']); // la nota queda escrita
    expect(apiService.post).toHaveBeenCalledTimes(1);
    expect(apiService.post).toHaveBeenCalledWith('/ai-agent/actions/del-1/confirm');
    expect(events).toContain(GUIDED_EVENTS.changed);
    off?.();
    document.body.querySelectorAll('textarea').forEach((e) => e.remove());
  }, 15000);

  it('entregar sin botón «Entregar» en pantalla (viaje sin iniciar): entrega directamente con aviso', async () => {
    apiService.post.mockResolvedValue({ success: true, result: { message: 'Paquete TRK-9 marcado como entregado.' } });
    renderApp(DELIVER(['TRK-9']));
    await userEvent.click(screen.getByText('empezar'));
    await waitFor(() => expect(out).toBeDefined(), { timeout: 20000 });
    expect(out.result.result.message).toMatch(/TRK-9/);
    expect(apiService.post).toHaveBeenCalledTimes(1);
    expect(events).toContain(GUIDED_EVENTS.cancelForm);
  }, 25000);

  it('si el viaje no está en la lista del formulario, igual sigue y confirma (la propuesta ya avisó)', async () => {
    apiService.post.mockResolvedValue({ success: true, result: { message: 'Asignado.' } });
    const picks = [];
    const b = Object.assign(document.createElement('button'), { textContent: 'Vincular' });
    b.setAttribute('data-logi-vincular', 'TRK-1');
    let off;
    b.addEventListener('click', () => {
      const select = Object.assign(document.createElement('select'), { name: 'routeId' }); // sin la opción del viaje pedido
      select.add(new Option('Otro viaje', 'otro'));
      document.body.appendChild(select);
      off = registerGuidedForm('assignment', { isReady: () => true, setValue: (n, v) => picks.push([n, v]), getElement: () => select });
    });
    document.body.appendChild(b);

    renderApp(ASSIGN(['TRK-1']));
    await userEvent.click(screen.getByText('empezar'));
    await waitFor(() => expect(out).toBeDefined(), { timeout: 8000 });
    expect(picks).toEqual([]); // no inventa una opción que no existe
    expect(apiService.post).toHaveBeenCalledTimes(1);
    off?.();
  }, 15000);
});
