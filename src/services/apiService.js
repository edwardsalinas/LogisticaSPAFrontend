import api from './api';
import streamChat from './streamChat';

const apiService = {
  // Chat con el asistente con la respuesta en vivo (ver streamChat.js)
  chatStream: (body, handlers) => streamChat(body, handlers),
  // Historial de conversaciones del asistente (cada usuario ve solo las suyas) y uso de la IA (administradores)
  getAiConversations: () => api.get('/ai-agent/conversations'),
  getAiConversation: (id) => api.get(`/ai-agent/conversations/${id}`),
  deleteAiConversation: (id) => api.delete(`/ai-agent/conversations/${id}`),
  // Convierte un grupo de las sugerencias de asignación en una propuesta a confirmar (sin llamar al modelo)
  // Deshace la asignación de un paquete a un viaje (solo mientras siga «asignado» y el viaje no haya salido)
  unassignPackage: (id) => api.post(`/logistics/packages/${id}/unassign`),
  // Anula un paquete recién creado (queda «cancelado»; solo si sigue pendiente, sin viaje y creado hace menos de 2 horas)
  cancelPackage: (id) => api.post(`/logistics/packages/${id}/cancel`),
  // Prepara la propuesta de un evento de seguimiento (sin el modelo); se confirma aparte
  prepareEvent: (body) => api.post('/ai-agent/suggestions/event', body),
  prepareAssignment: (body) => api.post('/ai-agent/suggestions/assign', body),
  // Leer la foto de una guía de remisión (devuelve los campos para revisarlos) y, ya revisados, preparar el registro
  extractDocument: (body) => api.post('/ai-agent/documents/extract', body, { timeout: 60000 }),
  proposeFromDocument: (body) => api.post('/ai-agent/documents/propose', body),
  // Avisos proactivos de Logi (solo personal) y eventos de uso para las métricas (fire-and-forget, ver logiEvents.js)
  getLogiAlerts: () => api.get('/ai-agent/alerts'),
  // Remitentes y destinatarios frecuentes (memoria de uso) para que la voz reconozca nombres conocidos
  getLogiContacts: () => api.get('/ai-agent/contacts'),
  trackLogiEvent: (body) => api.post('/ai-agent/logi-events', body),
  getAiUsage: (days = 7) => api.get('/ai-agent/usage', { params: { days } }),
  getRoutes: () => api.get('/logistics/routes'),
  getCheckpointsByRoute: (routeId) => api.get(`/logistics/routes/${routeId}/checkpoints`),
  getPackages: () => api.get('/logistics/packages'),
  getTrackingLogs: (packageId) => api.get(`/tracking/logs/${packageId}`),
  createTrackingEvent: (data) => api.post('/tracking', data),
  getVehicles: () => api.get('/fleet/vehicles'),
  createVehicle: (data) => api.post('/fleet/vehicles', data),
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
  // Envío en lote de los puntos GPS acumulados sin conexión (cola offline)
  logTripEventsBatch: (tripId, points) => api.post(`/tracking/trip/${tripId}/events/batch`, { points }),
  checkGeofence: (data) => api.post('/tracking/check-geofence', data),
  getRouteTracking: (routeId) => api.get(`/tracking/route/${routeId}`),
  // El rastreo público puede exigir captcha (header x-captcha-token)
  getPublicTracking: (code, captchaToken) =>
    api.get(`/tracking/public/${encodeURIComponent(code)}`, captchaToken ? { headers: { 'x-captcha-token': captchaToken } } : undefined),

  // Schedules (Cronogramas)
  getSchedules: (params) => api.get('/fleet/schedules', { params }),
  getSchedule: (id) => api.get(`/fleet/schedules/${id}`),
  createSchedule: (data) => api.post('/fleet/schedules', data),
  updateSchedule: (id, data) => api.put(`/fleet/schedules/${id}`, data),
  deleteSchedule: (id) => api.delete(`/fleet/schedules/${id}`),
  generateRoutesFromSchedules: (daysAhead = 7) => api.post('/fleet/schedules/generate', { days_ahead: daysAhead }),

  // Statistics
  getPublicStats: () => api.get('/statistics/public'),
  getDashboardStats: () => api.get('/statistics/dashboard'),

  post: api.post,
  put: api.put,
  patch: api.patch,
  delete: api.delete,
  get: api.get,
  async getAnalytics({ from, to } = {}) {
    return api.get('/statistics/analytics', { params: { from, to } });
  },
  async deliverPackage(id, note) {
    const trimmed = typeof note === 'string' ? note.trim() : '';
    return api.patch(`/logistics/packages/${id}/deliver`, trimmed ? { note: trimmed } : {});
  },
};

export default apiService;
