import { describe, it, expect } from 'vitest';
import {
  PACKAGE_STATUS,
  ROUTE_STATUS,
  normalizePackageStatus,
  normalizeRouteStatus,
  isPackageDelivered,
  isRouteFinished,
  isRouteActive,
  isPackageIncident,
  PACKAGE_LABEL,
  PACKAGE_VARIANT,
  packageProgress,
  packageStatusLabel,
  packageStatusVariant,
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

describe('RF02: estados En agencia y Siniestro', () => {
  it('existen con los mismos valores que el backend', () => {
    expect(PACKAGE_STATUS.AT_AGENCY).toBe('en_agencia');
    expect(PACKAGE_STATUS.INCIDENT).toBe('siniestro');
  });

  it('se normalizan desde alias en inglés y mayúsculas', () => {
    expect(normalizePackageStatus('AT_AGENCY')).toBe('en_agencia');
    expect(normalizePackageStatus('incident')).toBe('siniestro');
    expect(isPackageIncident(' Siniestro ')).toBe(true);
    expect(isPackageIncident('entregado')).toBe(false);
  });
});

describe('cómo se ve un estado de paquete (igual en todas las pantallas)', () => {
  it('tiene etiqueta en español para TODOS los estados del backend', () => {
    for (const st of Object.values(PACKAGE_STATUS)) {
      expect(PACKAGE_LABEL[st], st).toBeTruthy();
      expect(PACKAGE_VARIANT[st], st).toBeTruthy();
    }
  });
  it('acepta los alias antiguos y estados con otra capitalización', () => {
    expect(packageStatusLabel('in_transit')).toBe('En tránsito');
    expect(packageStatusLabel('Pendiente')).toBe('Pendiente');
    expect(packageStatusLabel('en_agencia')).toBe('En agencia');
    expect(packageStatusLabel('siniestro')).toBe('Siniestro');
    expect(packageStatusVariant('siniestro')).toBe('danger');
  });
  it('un estado desconocido se muestra tal cual y sin color; vacío es una raya', () => {
    expect(packageStatusLabel('raro')).toBe('raro');
    expect(packageStatusVariant('raro')).toBe('neutral');
    expect(packageStatusLabel(undefined)).toBe('—');
  });
  it('el avance solo existe para el recorrido normal: un siniestro o una devolución NO inventan un porcentaje', () => {
    expect(packageProgress('pendiente')).toBe(10);
    expect(packageProgress('en_transito')).toBe(50);
    expect(packageProgress('entregado')).toBe(100);
    expect(packageProgress('siniestro')).toBeNull();
    expect(packageProgress('devuelto')).toBeNull();
    expect(packageProgress('cancelado')).toBeNull();
    expect(packageProgress(undefined)).toBeNull();
  });
});
