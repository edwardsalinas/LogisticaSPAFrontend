// Usuarios de prueba de las pruebas e2e. Sus contraseñas NO están en el código (el repositorio es público): se leen de las variables de
// entorno E2E_ADMIN_PASSWORD, E2E_OPERATOR_PASSWORD, E2E_DRIVER_PASSWORD y E2E_CLIENT_PASSWORD, o del archivo .env.e2e.local (que git ignora).
// Ese archivo lo crea LogisticaSPABackend/scripts/rotar-claves-prueba.mjs. En GitHub Actions vienen de los secretos del repositorio.
try { process.loadEnvFile('.env.e2e.local'); } catch { /* no existe: se usan las variables de entorno */ }

const env = (name, fallback = '') => process.env[name] || fallback;
const need = (name) => {
  const v = process.env[name];
  if (!v) throw new Error(`Falta ${name}. Define las contraseñas de los usuarios de prueba en .env.e2e.local (ver e2e/README.md) o como variable de entorno.`);
  return v;
};
// se exige la contraseña solo al USAR esa cuenta (así una prueba de un solo rol no pide las otras tres)
const user = (role, defaultEmail) => ({
  email: env(`E2E_${role}_EMAIL`, defaultEmail),
  get password() { return need(`E2E_${role}_PASSWORD`); },
});

export const USERS = {
  admin: user('ADMIN', 'admin@logistica.bo'),
  operator: user('OPERATOR', 'operador@logistica.bo'),
  driver: user('DRIVER', 'driver@logistica.bo'),
  client: user('CLIENT', 'cliente@logistica.bo'),
};
