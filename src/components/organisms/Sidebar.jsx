import {
  BarChart3,
  Sparkles,
  Crosshair,
  LayoutDashboard,
  Map,
  Package,
  Truck,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../app/AuthContext';
import useRole from '../../app/useRole';
import { useAiMode } from '../../app/AiModeContext';

export const navItems = [
  { path: '/', label: 'Dashboard', eyebrow: 'Resumen', icon: LayoutDashboard, roles: ['admin'] },
  { path: '/driver', label: 'Mi Viaje', eyebrow: 'Operación', icon: Truck, roles: ['driver'] },
  { path: '/logistics/packages', label: 'Paquetes', eyebrow: 'Operación', icon: Package, roles: ['admin', 'logistics_operator', 'client'] },
  { path: '/logistics/routes', label: 'Viajes', eyebrow: 'Planificación', icon: Map, roles: ['admin', 'logistics_operator'] },
  { path: '/tracking', label: 'Tracking', eyebrow: 'Seguimiento', icon: Crosshair, roles: ['admin', 'logistics_operator', 'client'] },
  { path: '/fleet', label: 'Flota', eyebrow: 'Unidades', icon: Truck, roles: ['admin'] },
  { path: '/analytics', label: 'Reportes', eyebrow: 'Métricas', icon: BarChart3, roles: ['admin'] },
];

/**
 * Menú según el modo. En Modo IA el asistente es la primera opción (y la página de inicio) y el Dashboard
 * pasa a /dashboard, disponible también para el operador.
 */
export const getNavItems = (aiMode) => {
  if (!aiMode) return navItems;
  const assistant = { path: '/', label: 'Asistente', eyebrow: 'IA', icon: Sparkles, roles: ['admin', 'logistics_operator', 'client', 'driver'] };
  const rest = navItems.map((item) => (item.path === '/' ? { ...item, path: '/dashboard', roles: ['admin', 'logistics_operator'] } : item));
  return [assistant, ...rest];
};

function Sidebar() {
  const { user } = useAuth();
  const { hasRole } = useRole();
  const { aiMode } = useAiMode();
  const visibleNavItems = getNavItems(aiMode).filter((item) => hasRole(item.roles));
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[17rem] flex-col border-r border-white/6 bg-[#06111f] p-4 text-white shadow-lg lg:flex">
      <div className="rounded-2xl border border-white/7 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5 motion-fade-in">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-md">
            <Truck size={18} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[1.05rem] font-bold tracking-tight text-white">LogisticaSPA</p>
            <p className="text-xs uppercase tracking-[0.28em] text-sky-200/55">Enterprise Control</p>
          </div>
        </div>
      </div>

      <nav className="mt-5 flex-1 space-y-2 overflow-y-auto pr-1">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-2xl border px-3 py-3 transition-all duration-250 ${
                  isActive
                    ? 'border-sky-400/30 bg-[linear-gradient(135deg,rgba(19,127,236,0.22),rgba(255,255,255,0.04))] shadow-sm'
                    : 'border-transparent text-slate-300 hover:-translate-y-0.5 hover:border-white/8 hover:bg-white/[0.04]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-250 ${
                      isActive
                        ? 'bg-sky-400 text-[#04111f]'
                        : 'bg-white/[0.06] text-slate-300 group-hover:bg-white/[0.09] group-hover:text-white'
                    }`}
                  >
                    <Icon size={18} strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-slate-200'}`}>
                      {item.label}
                    </p>
                    <p className="text-xs text-slate-400">
                      {item.eyebrow}
                    </p>
                  </div>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-white/6 pt-4">

        <div className="rounded-2xl border border-white/7 bg-white/[0.03] p-3">
          <p className="text-xs font-medium text-slate-400">Sesión activa</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.08] text-sm font-bold text-white">
              {user?.email?.substring(0, 2) || 'US'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{user?.email || 'Usuario'}</p>
              <p className="truncate text-xs capitalize text-slate-400">{user?.user_metadata?.role || 'Invitado'}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
