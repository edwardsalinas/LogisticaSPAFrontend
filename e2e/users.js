// Usuarios de prueba. Por defecto, los que crea LogisticaSPABackend/scripts/seed-users.js (solo desarrollo).
// Se pueden sobrescribir con variables de entorno: E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, etc.
const env = (name, fallback) => process.env[name] || fallback;

export const USERS = {
  admin: { email: env('E2E_ADMIN_EMAIL', 'admin@logistica.bo'), password: env('E2E_ADMIN_PASSWORD', 'Admin123!') },
  operator: { email: env('E2E_OPERATOR_EMAIL', 'operador@logistica.bo'), password: env('E2E_OPERATOR_PASSWORD', 'Operador123!') },
  driver: { email: env('E2E_DRIVER_EMAIL', 'driver@logistica.bo'), password: env('E2E_DRIVER_PASSWORD', 'Driver123!') },
  client: { email: env('E2E_CLIENT_EMAIL', 'cliente@logistica.bo'), password: env('E2E_CLIENT_PASSWORD', 'Cliente123!') },
};
