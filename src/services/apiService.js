import api from './api';

const apiService = {
  getRoutes: () => api.get('/logistics/routes'),
  getCheckpointsByRoute: (routeId) => api.get(`/logistics/routes/${routeId}/checkpoints`),
  getPackages: () => api.get('/logistics/packages'),
  getTrackingLogs: (packageId) => api.get(`/tracking/logs/${packageId}`),
  createTrackingEvent: (data) => api.post('/tracking', data),
  getVehicles: () => api.get('/fleet/vehicles'),
  getDrivers: () => api.get('/fleet/drivers'),
  getMapData: (packageId) => api.get(`/tracking/${packageId}/map-data`),
  
  getClients: () => api.get('/fleet/clients'),
  getPredefinedRoutes: () => api.get('/logistics/predefined-routes'),
  getRoute: (id) => api.get(`/logistics/routes/${id}`),
  createRoute: (data) => api.post('/logistics/routes', data),
  updateRoute: (id, data) => api.put(`/logistics/routes/${id}`, data),
  deleteRoute: (id) => api.delete(`/logistics/routes/${id}`),
  createCheckpoint: (routeId, data) => api.post(`/logistics/routes/${routeId}/checkpoints`, data),
  updateCheckpoint: (routeId, checkpointId, data) => api.put(`/logistics/routes/${routeId}/checkpoints/${checkpointId}`, data),
  deleteCheckpoint: (routeId, checkpointId) => api.delete(`/logistics/routes/${routeId}/checkpoints/${checkpointId}`),
  assignPackageToRoute: (routeId, packageId) => api.post(`/logistics/routes/${routeId}/assign`, { package_id: packageId }),
  startTrip: (routeId) => api.post('/tracking/trip/start', { route_id: routeId }),
  stopTrip: () => api.post('/tracking/trip/stop'),
  getActiveTrip: () => api.get('/tracking/trip/active'),
  logTripEvent: (tripId, data) => api.post(`/tracking/trip/${tripId}/event`, data),
  checkGeofence: (data) => api.post('/tracking/check-geofence', data),

  // Schedules (Cronogramas)
  getSchedules: (params) => api.get('/fleet/schedules', { params }),
  getSchedule: (id) => api.get(`/fleet/schedules/${id}`),
  createSchedule: (data) => api.post('/fleet/schedules', data),
  updateSchedule: (id, data) => api.put(`/fleet/schedules/${id}`, data),
  deleteSchedule: (id) => api.delete(`/fleet/schedules/${id}`),
  generateRoutesFromSchedules: (daysAhead = 7) => api.post('/fleet/schedules/generate', { days_ahead: daysAhead }),

  post: api.post,
  put: api.put,
  patch: api.patch,
  delete: api.delete,
  get: api.get,
};

export default apiService;
