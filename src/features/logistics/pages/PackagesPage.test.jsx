import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../../../services/api';
import PackagesPage from './PackagesPage';

vi.mock('../../../services/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../../../services/apiService', () => ({ default: { getPredefinedRoutes: vi.fn().mockResolvedValue({ data: [] }), getRoutes: vi.fn().mockResolvedValue({ data: [] }), getClients: vi.fn().mockResolvedValue({ data: [] }), post: vi.fn(), get: vi.fn() } }));
vi.mock('../../../app/useRole', () => ({ default: () => ({ role: 'admin', isClient: false, hasRole: () => true }) }));

const at = (days, hour = 12) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(hour, 0, 0, 0); return d.toISOString(); };
const ROUTES = [
  { id: 'rHoy', route_code: 'RT-HOY', origin: 'La Paz', destination: 'Oruro', status: 'planeada', departure_time: at(0), type: 'route' },
  { id: 'rOtro', route_code: 'RT-OTRO', origin: 'La Paz', destination: 'Sucre', status: 'planeada', departure_time: at(30), type: 'route' },
];
// A: sin viaje · B: con el viaje de HOY · C: con un viaje de OTRO día
const base = { origen: 'La Paz', peso: 2, sender_name: 'Prueba', recipient_name: 'Dest', created_at: new Date().toISOString() };
const PACKAGES = [
  { ...base, id: 'pA', tracking_code: 'TRK-AAA', destino: 'Oruro', status: 'pendiente', route_id: null, transport_routes: null },
  { ...base, id: 'pB', tracking_code: 'TRK-BBB', destino: 'Oruro', status: 'asignado', route_id: 'rHoy', transport_routes: { departure_time: at(0) } },
  { ...base, id: 'pC', tracking_code: 'TRK-CCC', destino: 'Sucre', status: 'asignado', route_id: 'rOtro', transport_routes: { departure_time: at(30) } },
];

const renderPage = () => render(<MemoryRouter><PackagesPage /></MemoryRouter>);
const waitLoaded = async () => { await waitFor(() => expect(api.get).toHaveBeenCalledWith('/logistics/routes')); await screen.findByRole('group', { name: /vista de paquetes/i }); };
const search = () => screen.getByLabelText('Buscar viaje o ruta');

beforeEach(() => {
  window.sessionStorage.clear();
  window.history.pushState({}, '', '/logistics/packages');
  api.get.mockReset();
  api.get.mockImplementation(async (url) => (url.includes('/routes') ? { data: ROUTES } : { data: PACKAGES }));
});
afterEach(() => window.sessionStorage.clear());

describe('Paquetes: un paquete recién creado se puede ENCONTRAR', () => {
  it('pide hasta 200 paquetes (el servidor da 50 por defecto)', async () => {
    renderPage(); await waitLoaded();
    expect(api.get).toHaveBeenCalledWith('/logistics/packages', { params: { limit: 200 } });
  });

  it('en el tablero «Operativos» el paquete SIN viaje se ve en Carga suelta, pero los que tienen viaje no están a la vista', async () => {
    renderPage(); await waitLoaded();
    await screen.findByText('TRK-AAA');
    expect(screen.queryByText('TRK-BBB')).toBeNull();   // dentro de su viaje, que arranca plegado
    expect(screen.queryByText('TRK-CCC')).toBeNull();   // su viaje es de otro día
  });

  it('la vista «Todos» muestra los tres, también el de otro día, con el código como enlace a su ficha', async () => {
    renderPage(); await waitLoaded();
    await userEvent.click(screen.getByRole('button', { name: /^todos$/i }));
    const table = await screen.findByRole('table', { name: /todos los paquetes/i });
    for (const code of ['TRK-AAA', 'TRK-BBB', 'TRK-CCC']) expect(within(table).getByRole('link', { name: code })).toHaveAttribute('href', expect.stringMatching(/^\/logistics\/packages\/p[ABC]$/));
    expect(screen.getByRole('heading', { name: /todos los paquetes/i })).toBeInTheDocument();
  });

  it('buscar un paquete de otro día en el tablero avisa que hay coincidencias fuera de la vista y lleva a «Todos»', async () => {
    renderPage(); await waitLoaded();
    await userEvent.type(search(), 'TRK-CCC');
    const notice = await screen.findByTestId('filtro-activo');
    expect(notice).toHaveTextContent('Filtrando por «TRK-CCC»');
    expect(notice).toHaveTextContent('hay 1 paquete más fuera de esta vista');
    await userEvent.click(within(notice).getByRole('button', { name: /ver en «todos»/i }));
    const table = await screen.findByRole('table', { name: /todos los paquetes/i });
    expect(within(table).getByRole('link', { name: 'TRK-CCC' })).toBeInTheDocument();
    expect(within(table).queryByRole('link', { name: 'TRK-AAA' })).toBeNull();
  });

  it('buscar un paquete que está en el viaje de hoy despliega el viaje solo, y no avisa de nada oculto', async () => {
    renderPage(); await waitLoaded();
    await userEvent.type(search(), 'TRK-BBB');
    await screen.findByText('TRK-BBB');                 // el viaje se despliega al buscar
    expect(screen.getByTestId('filtro-activo')).not.toHaveTextContent('fuera de esta vista');
  });

  it('el aviso de filtro tiene «Quitar filtro» y vuelve a mostrar todo', async () => {
    renderPage(); await waitLoaded();
    await userEvent.type(search(), 'zzz-no-existe');
    await userEvent.click(await screen.findByRole('button', { name: /quitar filtro/i }));
    expect(search()).toHaveValue('');
    expect(screen.queryByTestId('filtro-activo')).toBeNull();
    await screen.findByText('TRK-AAA');
  });

  it('la búsqueda NO se guarda entre visitas: al volver, la lista está limpia', async () => {
    const first = renderPage(); await waitLoaded();
    await userEvent.type(search(), 'TRK-CCC');
    expect(await screen.findByTestId('filtro-activo')).toBeInTheDocument();
    first.unmount();
    renderPage(); await waitLoaded();
    expect(search()).toHaveValue('');
    expect(screen.queryByTestId('filtro-activo')).toBeNull();
    await screen.findByText('TRK-AAA');
  });

  it('lo que Logi pidió filtrar antes de abrir la pantalla se aplica UNA vez y no se arrastra a la próxima visita', async () => {
    window.sessionStorage.setItem('logisticaspa:filtros:paquetes:busqueda', JSON.stringify('TRK-AAA'));
    window.sessionStorage.setItem('logisticaspa:filtros:paquetes:pestana', JSON.stringify('list'));
    const first = renderPage(); await waitLoaded();
    expect(search()).toHaveValue('TRK-AAA');
    expect(await screen.findByTestId('filtro-activo')).toHaveTextContent('TRK-AAA');
    first.unmount();
    window.sessionStorage.setItem('logisticaspa:filtros:paquetes:pestana', JSON.stringify('all'));
    renderPage(); await waitLoaded();
    expect(search()).toHaveValue('');
  });

  it('los estados se ven en español en la lista (no «en_agencia» ni «siniestro» crudos)', async () => {
    api.get.mockImplementation(async (url) => (url.includes('/routes') ? { data: ROUTES } : { data: [{ ...PACKAGES[0], status: 'en_agencia' }, { ...PACKAGES[0], id: 'pS', tracking_code: 'TRK-SSS', status: 'siniestro' }] }));
    renderPage(); await waitLoaded();
    await userEvent.click(screen.getByRole('button', { name: /^todos$/i }));
    const table = await screen.findByRole('table', { name: /todos los paquetes/i });
    expect(within(table).getByText('En agencia')).toBeInTheDocument();
    expect(within(table).getByText('Siniestro')).toBeInTheDocument();
  });

  it('si el servidor devuelve el tope (200), la lista «Todos» avisa que puede haber más antiguos', async () => {
    const many = Array.from({ length: 200 }, (_, i) => ({ ...PACKAGES[0], id: `p${i}`, tracking_code: `TRK-${i}` }));
    api.get.mockImplementation(async (url) => (url.includes('/routes') ? { data: ROUTES } : { data: many }));
    renderPage(); await waitLoaded();
    await userEvent.click(screen.getByRole('button', { name: /^todos$/i }));
    expect(await screen.findByText(/se muestran los 200 más recientes/)).toBeInTheDocument();
  });
});
