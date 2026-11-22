import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TrackingForm, { suggestedCityFor } from './TrackingForm';
import { matchCity, nearestCity, isInsideBolivia } from '../../../constants/bolivia';
import apiService from '../../../services/apiService';

vi.mock('../../../services/apiService', () => ({ default: { createTrackingEvent: vi.fn() } }));
// El mapa real (Leaflet) no se carga en jsdom: se sustituye por un botón que "marca" un punto
vi.mock('./LocationMap', () => ({
  default: ({ onPick }) => <button type="button" onClick={() => onPick(-17.9, -67.1)}>punto en el mapa</button>,
}));

const PACKAGES = [
  { id: 'p1', tracking_code: 'TRK-1', origen: 'Cochabamba', destino: 'La Paz' },
  { id: 'p2', tracking_code: 'TRK-2', origen: 'Calle sin ciudad conocida', destino: 'Otro lugar' },
];

const setup = () => {
  const onSuccess = vi.fn();
  render(<TrackingForm packages={PACKAGES} onSuccess={onSuccess} onCancel={vi.fn()} />);
  return onSuccess;
};

describe('Ciudades de Bolivia', () => {
  it('reconoce la ciudad dentro de un texto libre, sin importar tildes ni mayúsculas', () => {
    expect(matchCity('Cochabamba')?.key).toBe('cochabamba');
    expect(matchCity('av. blanco galindo, SANTA CRUZ')?.key).toBe('santa-cruz');
    expect(matchCity('Potosi')?.key).toBe('potosi');
    expect(matchCity('Marte')).toBeNull();
    expect(matchCity('')).toBeNull();
  });

  it('dice cuál es la ciudad más cercana a un punto', () => {
    const { city, km } = nearestCity(-17.9, -67.1);
    expect(city.key).toBe('oruro');
    expect(km).toBeLessThan(15);
  });

  it('reconoce lo que queda dentro y fuera de Bolivia', () => {
    expect(isInsideBolivia(-16.4897, -68.1193)).toBe(true);
    expect(isInsideBolivia(-2, -68)).toBe(false); // el valor que aparecía precargado en la captura
    expect(isInsideBolivia(40.4, -3.7)).toBe(false); // Madrid
  });

  it('sugiere el origen al asignar y el destino al entregar o dejar en agencia', () => {
    expect(suggestedCityFor(PACKAGES[0], 'asignado')?.key).toBe('cochabamba');
    expect(suggestedCityFor(PACKAGES[0], 'pendiente')?.key).toBe('cochabamba');
    expect(suggestedCityFor(PACKAGES[0], 'entregado')?.key).toBe('la-paz');
    expect(suggestedCityFor(PACKAGES[0], 'en_agencia')?.key).toBe('la-paz');
    expect(suggestedCityFor(PACKAGES[0], 'en_transito')).toBeNull(); // a mitad de camino no se adivina
    expect(suggestedCityFor(PACKAGES[1], 'asignado')).toBeNull();
    expect(suggestedCityFor(undefined, 'asignado')).toBeNull();
  });
});

describe('Elegir la ubicación sin saber coordenadas', () => {
  beforeEach(() => apiService.createTrackingEvent.mockReset());
  afterEach(() => { delete navigator.geolocation; });

  it('ya no hay valores precargados: sin ubicación pide elegir una (antes un campo vacío valía 0)', async () => {
    setup();
    await userEvent.selectOptions(screen.getByLabelText(/^paquete/i), 'p1');
    await userEvent.selectOptions(screen.getByLabelText(/^estado/i), 'en_transito');
    await userEvent.click(screen.getByRole('button', { name: /guardar evento/i }));
    expect(await screen.findByText(/elige una ubicación \(ciudad/i, {}, { timeout: 4000 })).toBeInTheDocument();
    expect(apiService.createTrackingEvent).not.toHaveBeenCalled();
  });

  it('ofrece usar la ciudad del paquete según el estado, y guarda sus coordenadas', async () => {
    const onSuccess = setup();
    await userEvent.selectOptions(screen.getByLabelText(/^paquete/i), 'p1');
    await userEvent.selectOptions(screen.getByLabelText(/^estado/i), 'asignado');
    expect(screen.getByText(/sugerida según el paquete: cochabamba/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /usar cochabamba/i }));
    expect(screen.getByRole('status')).toHaveTextContent('Ubicación elegida: Cochabamba');

    await userEvent.click(screen.getByRole('button', { name: /guardar evento/i }));
    await waitFor(() => expect(apiService.createTrackingEvent).toHaveBeenCalledTimes(1));
    expect(apiService.createTrackingEvent).toHaveBeenCalledWith({ package_id: 'p1', status: 'asignado', lat: -17.3895, lng: -66.1568 });
    expect(onSuccess).toHaveBeenCalled();
  });

  it('permite elegir cualquier ciudad de la lista', async () => {
    setup();
    await userEvent.selectOptions(screen.getByLabelText(/^ciudad/i), 'oruro');
    expect(screen.getByLabelText(/latitud/i)).toHaveValue(-17.9647);
    expect(screen.getByRole('status')).toHaveTextContent('Oruro');
  });

  it('"Usar mi ubicación" rellena la posición del dispositivo', async () => {
    navigator.geolocation = { getCurrentPosition: (ok) => ok({ coords: { latitude: -17.9, longitude: -67.1 } }) };
    setup();
    await userEvent.click(screen.getByRole('button', { name: /usar mi ubicación/i }));
    expect(screen.getByLabelText(/latitud/i)).toHaveValue(-17.9);
    expect(screen.getByRole('status')).toHaveTextContent('cerca de Oruro');
  });

  it('si el GPS está denegado, lo explica y ofrece las otras vías', async () => {
    navigator.geolocation = { getCurrentPosition: (_ok, fail) => fail({ code: 1 }) };
    setup();
    await userEvent.click(screen.getByRole('button', { name: /usar mi ubicación/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/permiso denegado.*elige una ciudad/i);
  });

  it('si el navegador no tiene geolocalización, lo avisa', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: /usar mi ubicación/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/no permite obtener la ubicación/i);
  });

  it('"Marcar en el mapa" muestra el mapa y un clic fija la ubicación', async () => {
    setup();
    const toggle = screen.getByRole('button', { name: /marcar en el mapa/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(await screen.findByRole('button', { name: 'punto en el mapa' }));
    expect(screen.getByLabelText(/latitud/i)).toHaveValue(-17.9);
    expect(screen.getByLabelText(/longitud/i)).toHaveValue(-67.1);
    expect(screen.getByRole('status')).toHaveTextContent('cerca de Oruro');
  });

  it('rechaza una ubicación fuera de Bolivia tecleada en las coordenadas exactas', async () => {
    setup();
    await userEvent.selectOptions(screen.getByLabelText(/^paquete/i), 'p1');
    await userEvent.selectOptions(screen.getByLabelText(/^estado/i), 'en_transito');
    await userEvent.type(screen.getByLabelText(/latitud/i), '-2');
    await userEvent.type(screen.getByLabelText(/longitud/i), '-68');
    await userEvent.click(screen.getByRole('button', { name: /guardar evento/i }));
    expect(await screen.findByText(/queda fuera de bolivia/i)).toBeInTheDocument();
    expect(apiService.createTrackingEvent).not.toHaveBeenCalled();
  });
});
