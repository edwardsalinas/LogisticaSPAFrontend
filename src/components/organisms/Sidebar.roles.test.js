import { describe, expect, it } from 'vitest';
import { getNavItems } from './Sidebar';

// Los flujos de navegación por rol que describe la documentación (sección "Flujo de navegación"), como prueba:
// si el menú cambia, o cambia la documentación o falla esto.
const menu = (role, aiMode = false) => getNavItems(aiMode).filter((i) => i.roles.includes(role)).map((i) => i.label);

describe('menú por rol (flujos de navegación documentados)', () => {
  it('administrador: Dashboard, Paquetes, Viajes, Tracking, Flota y Reportes', () => {
    expect(menu('admin')).toEqual(['Dashboard', 'Paquetes', 'Viajes', 'Tracking', 'Flota', 'Reportes']);
  });
  it('operador logístico: panel principal, Paquetes, Viajes y Tracking; sin Flota ni Reportes', () => {
    expect(menu('logistics_operator')).toEqual(['Dashboard', 'Paquetes', 'Viajes', 'Tracking']);
  });
  it('cliente: solo Paquetes (los suyos) y Tracking', () => {
    expect(menu('client')).toEqual(['Paquetes', 'Tracking']);
  });
  it('conductor: solo Mi viaje', () => {
    expect(menu('driver')).toEqual(['Mi Viaje']);
  });
  it('en Modo IA el asistente es la primera opción de todos los roles', () => {
    for (const role of ['admin', 'logistics_operator', 'client', 'driver']) {
      expect(menu(role, true)[0]).toBe('Asistente');
    }
  });
  it('en Modo IA el Dashboard sigue disponible para el operador', () => {
    expect(menu('logistics_operator', true)).toContain('Dashboard');
  });
});
