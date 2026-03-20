/**
 * Servicio híbrido: Usa mocks en desarrollo, API real en producción
 * Cambia la variable USE_MOCKS para alternar
 */

import { mockApi, mockRoutes, mockCheckpoints, mockTrackingLogs } from './api.mock';
import api from './api';

// ========================================
// CONFIGURACIÓN: Cambiar a false para usar API real
// ========================================
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false';

/**
 * Wrapper que decide si usar mocks o API real
 */
const apiService = {
  /**
   * GET /api/logistics/routes
   */
  async getRoutes() {
    if (USE_MOCKS) {
      return mockApi.getRoutes();
    }
    return api.get('/logistics/routes');
  },

  /**
   * GET /api/logistics/routes/:routeId/checkpoints
   */
  async getCheckpointsByRoute(routeId) {
    if (USE_MOCKS) {
      return mockApi.getCheckpointsByRoute(routeId);
    }
    return api.get(`/logistics/routes/${routeId}/checkpoints`);
  },

  /**
   * GET /api/logistics/packages
   */
  async getPackages() {
    if (USE_MOCKS) {
      // Devolver paquetes mock si existen, sino llamar API real
      try {
        return await api.get('/logistics/packages');
      } catch {
        return {
          data: [
            {
              id: 'pkg-001',
              tracking_code: 'PKG-001',
              origen: 'La Paz',
              destino: 'Oruro',
              peso: 15.5,
              status: 'in_transit',
              route_id: 'route-001'
            },
            {
              id: 'pkg-002',
              tracking_code: 'PKG-002',
              origen: 'Santa Cruz',
              destino: 'Cochabamba',
              peso: 8.2,
              status: 'pending',
              route_id: null
            },
          ]
        };
      }
    }
    return api.get('/logistics/packages');
  },

  /**
   * GET /api/tracking/logs/:packageId
   */
  async getTrackingLogs(packageId) {
    if (USE_MOCKS) {
      return mockApi.getTrackingLogs(packageId);
    }
    return api.get(`/tracking/logs/${packageId}`);
  },

  /**
   * POST /api/tracking
   */
  async createTrackingEvent(data) {
    if (USE_MOCKS) {
      return mockApi.createTrackingEvent(data);
    }
    return api.post('/tracking', data);
  },

  /**
   * GET /api/fleet/vehicles
   */
  async getVehicles() {
    if (USE_MOCKS) {
      try {
        return await api.get('/fleet/vehicles');
      } catch {
        return {
          data: [
            { id: 'vehicle-001', plate_number: 'INT-1234', brand: 'Volvo', model: 'FH16', year: 2023, status: 'active' },
            { id: 'vehicle-002', plate_number: 'ABC-5678', brand: 'Mercedes', model: 'Actros', year: 2022, status: 'maintenance' },
          ]
        };
      }
    }
    return api.get('/fleet/vehicles');
  },

  /**
   * GET /api/fleet/drivers
   */
  async getDrivers() {
    if (USE_MOCKS) {
      try {
        return await api.get('/fleet/drivers');
      } catch {
        return {
          data: [
            { id: 'driver-001', full_name: 'Juan Pérez', email: 'juan@transportes.bo', phone: '+591 70012345' },
            { id: 'driver-002', full_name: 'María López', email: 'maria@transportes.bo', phone: '+591 70054321' },
          ]
        };
      }
    }
    return api.get('/fleet/drivers');
  },

  /**
   * GET /api/tracking/:packageId/map-data
   */
  async getMapData(packageId) {
    if (USE_MOCKS) {
      return mockApi.getMapData(packageId);
    }
    return api.get(`/tracking/${packageId}/map-data`);
  },

  // ========================================
  // Métodos restantes que pasan directo a la API
  // ========================================
  post: api.post,
  put: api.put,
  patch: api.patch,
  delete: api.delete,
  get: (endpoint) => {
    if (USE_MOCKS && endpoint.includes('/checkpoints')) {
      // Manejo especial para checkpoints
      const routeId = endpoint.match(/\/routes\/([^/]+)\/checkpoints/)?.[1];
      if (routeId) {
        return mockApi.getCheckpointsByRoute(routeId);
      }
    }
    return api.get(endpoint);
  },
};

export default apiService;
export { USE_MOCKS };
