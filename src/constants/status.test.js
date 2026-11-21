import { describe, it, expect } from 'vitest';
import {
  PACKAGE_STATUS,
  ROUTE_STATUS,
  normalizePackageStatus,
  normalizeRouteStatus,
  isPackageDelivered,
  isRouteFinished,
  isRouteActive,
} from './status';

describe('estados de paquetes', () => {
  it('reconoce los estados del backend', () => {
    expect(isPackageDelivered('entregado')).toBe(true);
    expect(isPackageDelivered('en_transito')).toBe(false);
    expect(normalizePackageStatus('en_transito')).toBe(PACKAGE_STATUS.IN_TRANSIT);
  });

  it('acepta los alias antiguos en inglés y es tolerante con mayúsculas y espacios', () => {
    expect(normalizePackageStatus('delivered')).toBe('entregado');
    expect(normalizePackageStatus(' In_Transit ')).toBe('en_transito');
    expect(normalizePackageStatus('pending')).toBe('pendiente');
    expect(isPackageDelivered('DELIVERED')).toBe(true);
  });

  it('un valor vacío o desconocido no se considera entregado', () => {
    expect(isPackageDelivered(undefined)).toBe(false);
    expect(isPackageDelivered(null)).toBe(false);
    expect(normalizePackageStatus('otro')).toBe('otro');
  });
});

describe('estados de rutas', () => {
  it('en_transito es una ruta activa; completada es finalizada', () => {
    expect(isRouteActive('en_transito')).toBe(true);
    expect(isRouteActive('active')).toBe(true);
    expect(isRouteFinished('completada')).toBe(true);
    expect(isRouteFinished('finalizada')).toBe(true);
    expect(isRouteFinished('completed')).toBe(true);
    expect(isRouteFinished('planeada')).toBe(false);
  });

  it('normaliza los alias de planificación', () => {
    expect(normalizeRouteStatus('pending')).toBe(ROUTE_STATUS.PLANNED);
    expect(normalizeRouteStatus('planeada')).toBe(ROUTE_STATUS.PLANNED);
  });
});
