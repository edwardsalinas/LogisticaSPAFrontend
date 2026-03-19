import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../organisms/Sidebar';
import Navbar from '../organisms/Navbar';

const pageTitles = {
  '/': 'Dashboard',
  '/logistics/packages': 'Gestión de Paquetes',
  '/logistics/routes': 'Gestión de Rutas',
  '/tracking': 'Trazabilidad',
  '/fleet': 'Gestión de Flota',
  '/ai-chat': 'Asistente IA',
};

function DashboardLayout() {
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'LogísticaSPA';

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar title={title} />
        <main className="flex-1 p-6 bg-surface-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
