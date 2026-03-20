import { NavLink, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/logistics/packages', label: 'Paquetes', icon: '📦' },
  { path: '/logistics/routes', label: 'Rutas', icon: '🗺️' },
  { path: '/tracking', label: 'Tracking', icon: '📍' },
  { path: '/fleet', label: 'Flota', icon: '🚛' },
  { path: '/ai-chat', label: 'Asistente IA', icon: '🤖' },
  { path: '/analytics', label: '📈 Reportes', icon: '📈' },
];

function Sidebar() {
  const location = useLocation();

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <span className="sidebar__logo">🚚 LogísticaSPA</span>
      </div>
      <nav className="sidebar__nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
            }
          >
            <span className="sidebar__icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
