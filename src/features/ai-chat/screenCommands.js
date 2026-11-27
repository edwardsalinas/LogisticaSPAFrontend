import { requestSearch, requestTab } from './pageContext';

/**
 * Órdenes de pantalla: lo que Logi hace para ENSEÑAR algo (ir a una pantalla, abrir una pestaña, filtrar una tabla). Las pide el
 * asistente (herramienta show_on_screen, adjunto `ui_command`) y las atiende el navegador. Solo mueven la vista: nunca cambian datos.
 *
 * El navegador NO se fía de lo que llega: la pantalla y lo que admite se comprueban aquí contra esta lista (que repite el menú de la
 * aplicación y lo que cada pantalla sabe hacer), y por rol. Una pantalla nueva con buscador se anota aquí y se conecta con
 * useSearchRequests / useTabRequests en su página.
 */
const STAFF = ['admin', 'logistics_operator'];
export const SCREENS = {
  dashboard: { to: '/dashboard', roles: STAFF },
  packages: { to: '/logistics/packages', roles: [...STAFF, 'client'], tabs: ['all', 'delivered'], search: true },
  routes: { to: '/logistics/routes', roles: STAFF, tabs: ['calendar', 'list'], search: true },
  tracking: { to: '/tracking', roles: [...STAFF, 'client'], search: true },
  fleet: { to: '/fleet', roles: ['admin'], tabs: ['vehicles', 'drivers'], search: true },
  analytics: { to: '/analytics', roles: ['admin'] },
  driver: { to: '/driver', roles: ['driver'] },
};

let navigator = null;
let currentRole = null;
/** El layout registra cómo navegar y el rol de quien usa la aplicación. */
export const registerScreenRuntime = (navigate, role) => {
  navigator = navigate; currentRole = role;
  return () => { if (navigator === navigate) { navigator = null; currentRole = null; } };
};

/** Ejecuta una orden de pantalla. Devuelve true si la hizo. */
export const runScreenCommand = (cmd) => {
  const screen = SCREENS[cmd?.page];
  if (!screen || !navigator || !screen.roles.includes(currentRole)) return false;
  navigator(screen.to);
  if (cmd.tab && screen.tabs?.includes(cmd.tab)) requestTab(cmd.page, cmd.tab);
  if (screen.search && typeof cmd.search === 'string') requestSearch(cmd.page, cmd.search.slice(0, 60));
  return true;
};

/** Las órdenes de pantalla que trae la respuesta del asistente (adjuntos ui_command). */
export const runScreenCommands = (attachments = []) => {
  let done = 0;
  for (const a of attachments) if (a?.kind === 'ui_command' && runScreenCommand(a)) done += 1;
  return done;
};
