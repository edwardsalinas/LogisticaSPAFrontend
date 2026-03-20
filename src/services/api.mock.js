/**
 * MOCKS para desarrollo frontend sin backend
 * Simula las respuestas de la API para mapas, checkpoints y tracking
 */

// ========================================
// DATOS MOCK - CHECKPOINTS
// ========================================
const mockCheckpoints = [
  {
    id: 'cp-001',
    route_id: 'route-001',
    name: 'Terminal La Paz',
    lat: -16.5000,
    lng: -68.1193,
    radius_meters: 150,
    sequence_order: 1,
    created_at: '2026-03-15T08:00:00Z',
  },
  {
    id: 'cp-002',
    route_id: 'route-001',
    name: 'Checkpoint El Alto',
    lat: -16.5100,
    lng: -68.1500,
    radius_meters: 100,
    sequence_order: 2,
    created_at: '2026-03-15T08:00:00Z',
  },
  {
    id: 'cp-003',
    route_id: 'route-001',
    name: 'Puesto Viacha',
    lat: -16.6500,
    lng: -68.3100,
    radius_meters: 120,
    sequence_order: 3,
    created_at: '2026-03-15T08:00:00Z',
  },
  {
    id: 'cp-004',
    route_id: 'route-001',
    name: 'Terminal Oruro',
    lat: -17.9833,
    lng: -67.1500,
    radius_meters: 200,
    sequence_order: 4,
    created_at: '2026-03-15T08:00:00Z',
  },
];

// ========================================
// DATOS MOCK - TRACKING LOGS
// ========================================
const mockTrackingLogs = [
  {
    id: 'log-001',
    package_id: 'pkg-001',
    lat: -16.5050,
    lng: -68.1300,
    status: 'in_transit',
    timestamp: '2026-03-19T10:30:00Z',
  },
  {
    id: 'log-002',
    package_id: 'pkg-001',
    lat: -16.5200,
    lng: -68.1600,
    status: 'in_transit',
    timestamp: '2026-03-19T11:00:00Z',
  },
  {
    id: 'log-003',
    package_id: 'pkg-001',
    lat: -16.5800,
    lng: -68.2500,
    status: 'in_transit',
    timestamp: '2026-03-19T11:30:00Z',
  },
];

// ========================================
// DATOS MOCK - CHECKPOINT VISITS
// ========================================
const mockCheckpointVisits = [
  {
    id: 'visit-001',
    checkpoint_id: 'cp-001',
    tracking_log_id: 'log-001',
    detected_at: '2026-03-19T10:30:00Z',
    within_radius: true,
    distance_meters: 85.5,
  },
];

// ========================================
// DATOS MOCK - RUTAS CON GEOMETRÍA
// ========================================
const mockRoutes = [
  {
    id: 'route-001',
    origin: 'La Paz',
    destination: 'Oruro',
    driver_id: 'driver-001',
    vehicle_id: 'vehicle-001',
    status: 'active',
    route_geometry: {
      type: 'LineString',
      coordinates: [
        [-68.1193, -16.5000], // La Paz
        [-68.1500, -16.5100], // El Alto
        [-68.3100, -16.6500], // Viacha
        [-67.1500, -17.9833], // Oruro
      ],
    },
    estimated_duration_minutes: 180,
    total_distance_km: 230,
  },
];

// ========================================
// SIMULACIÓN DE RETARDO DE RED
// ========================================
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ========================================
// FUNCIONES MOCK DE LA API
// ========================================

export const mockApi = {
  /**
   * GET /api/logistics/routes/:routeId/checkpoints
   */
  async getCheckpointsByRoute(routeId) {
    await delay(300);
    const checkpoints = mockCheckpoints.filter((cp) => cp.route_id === routeId);
    return { data: checkpoints };
  },

  /**
   * POST /api/logistics/routes/:routeId/checkpoints
   */
  async createCheckpoint(routeId, checkpointData) {
    await delay(400);
    const newCheckpoint = {
      id: `cp-${Date.now()}`,
      route_id: routeId,
      ...checkpointData,
      created_at: new Date().toISOString(),
    };
    mockCheckpoints.push(newCheckpoint);
    return { data: newCheckpoint };
  },

  /**
   * PUT /api/logistics/routes/:routeId/checkpoints/:checkpointId
   */
  async updateCheckpoint(routeId, checkpointId, updates) {
    await delay(300);
    const index = mockCheckpoints.findIndex(
      (cp) => cp.id === checkpointId && cp.route_id === routeId
    );
    if (index === -1) {
      throw new Error('Checkpoint no encontrado');
    }
    mockCheckpoints[index] = {
      ...mockCheckpoints[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    return { data: mockCheckpoints[index] };
  },

  /**
   * DELETE /api/logistics/routes/:routeId/checkpoints/:checkpointId
   */
  async deleteCheckpoint(routeId, checkpointId) {
    await delay(200);
    const index = mockCheckpoints.findIndex(
      (cp) => cp.id === checkpointId && cp.route_id === routeId
    );
    if (index === -1) {
      throw new Error('Checkpoint no encontrado');
    }
    mockCheckpoints.splice(index, 1);
    return { success: true };
  },

  /**
   * POST /api/logistics/routes/:routeId/checkpoints/reorder
   */
  async reorderCheckpoints(routeId, checkpointIds) {
    await delay(300);
    checkpointIds.forEach((id, index) => {
      const cp = mockCheckpoints.find((c) => c.id === id);
      if (cp) {
        cp.sequence_order = index + 1;
      }
    });
    return { success: true };
  },

  /**
   * POST /api/tracking/check-geofence
   */
  async checkGeofence({ lat, lng, package_id }) {
    await delay(200);
    
    // Obtener ruta del paquete (mock)
    const route = mockRoutes[0];
    if (!route) {
      return { data: { within_checkpoint: false } };
    }

    // Buscar checkpoints de la ruta
    const checkpoints = mockCheckpoints.filter((cp) => cp.route_id === route.id);

    // Calcular distancia a cada checkpoint
    for (const checkpoint of checkpoints) {
      const distance = calculateDistance(lat, lng, checkpoint.lat, checkpoint.lng);
      
      if (distance <= checkpoint.radius_meters) {
        return {
          data: {
            within_checkpoint: true,
            checkpoint,
            distance_meters: distance,
          },
        };
      }
    }

    return { data: { within_checkpoint: false } };
  },

  /**
   * GET /api/tracking/:packageId/map-data
   */
  async getMapData(packageId) {
    await delay(400);
    
    const logs = mockTrackingLogs.filter((log) => log.package_id === packageId);
    const route = mockRoutes[0];
    const checkpoints = mockCheckpoints.filter((cp) => cp.route_id === route?.id);

    return {
      data: {
        package: { id: packageId, tracking_code: 'PKG-001', route_id: route?.id },
        route,
        checkpoints,
        tracking_logs: logs,
      },
    };
  },

  /**
   * GET /api/tracking/logs/:packageId
   */
  async getTrackingLogs(packageId) {
    await delay(300);
    const logs = mockTrackingLogs.filter((log) => log.package_id === packageId);
    return { data: logs };
  },

  /**
   * POST /api/tracking (registrar evento)
   */
  async createTrackingEvent(eventData) {
    await delay(400);
    const newEvent = {
      id: `log-${Date.now()}`,
      ...eventData,
      timestamp: new Date().toISOString(),
    };
    mockTrackingLogs.unshift(newEvent);
    
    // Verificar geofencing automáticamente
    const geofenceResult = await this.checkGeofence({
      lat: eventData.lat,
      lng: eventData.lng,
      package_id: eventData.package_id,
    });

    if (geofenceResult.data.within_checkpoint) {
      mockCheckpointVisits.push({
        id: `visit-${Date.now()}`,
        checkpoint_id: geofenceResult.data.checkpoint.id,
        tracking_log_id: newEvent.id,
        detected_at: new Date().toISOString(),
        within_radius: true,
        distance_meters: geofenceResult.data.distance_meters,
      });
    }

    return { data: newEvent };
  },

  /**
   * GET /api/logistics/routes (para obtener rutas con geometría)
   */
  async getRoutes() {
    await delay(300);
    return { data: mockRoutes };
  },
};

// ========================================
// UTILIDAD: Fórmula Haversine para distancia
// ========================================
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371e3; // Radio de la Tierra en metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // metros
}

// ========================================
// EXPORTS PARA LOS COMPONENTES
// ========================================
export { mockCheckpoints, mockTrackingLogs, mockCheckpointVisits, mockRoutes };
