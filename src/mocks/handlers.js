import { http, HttpResponse } from 'msw';

// Reusing existing mock data
const MOCK_ROUTES = [
  {
    id: 'route-001',
    route_code: 'RT-001',
    origin: 'La Paz',
    destination: 'Oruro',
    driver_name: 'Juan Perez',
    vehicle_brand: 'Volvo',
    plate_number: 'INT-1234',
    status: 'active',
    progress: 65,
    next_checkpoint: 'Centro Logistico El Alto',
    eta: '14:30',
    eta_minutes: 25,
    remaining_distance: 45.2,
    driver_phone: '+591 70012345',
    checkpoints: [
      { id: 'cp-001', name: 'Terminal La Paz', lat: -16.5, lng: -68.1193, sequence_order: 1 },
      { id: 'cp-002', name: 'Checkpoint El Alto', lat: -16.51, lng: -68.15, sequence_order: 2 },
      { id: 'cp-003', name: 'Puesto Viacha', lat: -16.65, lng: -68.31, sequence_order: 3 },
      { id: 'cp-004', name: 'Terminal Oruro', lat: -17.9833, lng: -67.15, sequence_order: 4 }
    ],
    vehicle_position: { lat: -16.58, lng: -68.25 }
  },
  {
    id: 'route-002',
    route_code: 'RT-002',
    origin: 'Santa Cruz',
    destination: 'Cochabamba',
    driver_name: 'Maria Lopez',
    vehicle_brand: 'Mercedes',
    plate_number: 'ABC-5678',
    status: 'delayed',
    progress: 45,
    next_checkpoint: 'Sacaba',
    eta: '16:00',
    eta_minutes: 90,
    remaining_distance: 78.5,
    driver_phone: '+591 70054321',
    checkpoints: [
      { id: 'cp-005', name: 'Terminal Santa Cruz', lat: -17.7833, lng: -63.1821, sequence_order: 1 },
      { id: 'cp-006', name: 'Colomi', lat: -17.4167, lng: -66.2833, sequence_order: 2 },
      { id: 'cp-007', name: 'Terminal Cochabamba', lat: -17.3895, lng: -66.1568, sequence_order: 3 }
    ],
    vehicle_position: { lat: -17.55, lng: -65.8 }
  },
  {
    id: 'route-003',
    route_code: 'RT-003',
    origin: 'Sucre',
    destination: 'Potosi',
    driver_name: 'Carlos Ruiz',
    vehicle_brand: 'Ford',
    plate_number: 'XYW-9012',
    status: 'pending',
    progress: 0,
    next_checkpoint: 'Por asignar',
    eta: '--',
    eta_minutes: 0,
    remaining_distance: 0,
    driver_phone: '+591 70098765',
    checkpoints: [],
    vehicle_position: null
  },
];

const MOCK_PACKAGES = [
  { id: 'pkg-001', tracking_code: 'PKG-001', origen: 'La Paz', destino: 'Oruro', peso: 15.5, status: 'in_transit', route_id: 'route-001' },
  { id: 'pkg-002', tracking_code: 'PKG-002', origen: 'Santa Cruz', destino: 'Cochabamba', peso: 8.2, status: 'pending', route_id: null },
];

const MOCK_VEHICLES = [
  { id: 'v-001', plate_number: 'INT-1234', brand: 'Volvo', model: 'FH16', year: 2023, type: 'truck', capacity_kg: 25000, status: 'active', driver: 'Juan Perez' },
  { id: 'v-002', plate_number: 'ABC-5678', brand: 'Mercedes', model: 'Actros', year: 2022, type: 'truck', capacity_kg: 22000, status: 'active', driver: 'Maria Lopez' },
  { id: 'v-003', plate_number: 'XYZ-9012', brand: 'Ford', model: 'Cargo', year: 2021, type: 'light_truck', capacity_kg: 12000, status: 'maintenance', driver: null },
];

const MOCK_DRIVERS = [
  { id: 'd-001', full_name: 'Juan Perez', email: 'juan@transportes.bo', phone: '+591 70012345', license_number: 'LIC-123456', license_type: 'C', status: 'active' },
  { id: 'd-002', full_name: 'Maria Lopez', email: 'maria@transportes.bo', phone: '+591 70054321', license_number: 'LIC-234567', license_type: 'C', status: 'active' },
];

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const handlers = [
  http.get(`${API_BASE}/logistics/routes`, () => {
    return HttpResponse.json({ data: MOCK_ROUTES });
  }),
  
  http.get(`${API_BASE}/logistics/routes/:routeId`, ({ params }) => {
    const route = MOCK_ROUTES.find(r => r.id === params.routeId);
    return HttpResponse.json({ data: route });
  }),

  http.get(`${API_BASE}/logistics/packages`, () => {
    return HttpResponse.json({ data: MOCK_PACKAGES });
  }),

  http.get(`${API_BASE}/fleet/vehicles`, () => {
    return HttpResponse.json({ data: MOCK_VEHICLES });
  }),

  http.get(`${API_BASE}/fleet/drivers`, () => {
    return HttpResponse.json({ data: MOCK_DRIVERS });
  }),
  
  /*
  // Perfil mockeado de usuario (Comentado para usar Backend Real)
  http.get(`${API_BASE}/iam/profile`, () => {
    return HttpResponse.json({
      user: { id: 'usr-1', user_metadata: { role: 'admin' }, name: 'Admin Usuario', email: 'admin@logistica.com' }
    });
  }),
  
  // Login Fake (Comentado para usar Backend Real y obtener un verdadero JWT)
  http.post(`${API_BASE}/iam/login`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      data: {
        session: { access_token: 'fake-jwt-token-123456' },
        user: { id: 'usr-1', user_metadata: { role: 'admin' }, name: body.email, email: body.email }
      }
    });
  }),
  */
];
