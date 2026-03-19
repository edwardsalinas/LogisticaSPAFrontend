import { useState, useEffect } from 'react';
import StatCard from '../../../components/molecules/StatCard';
import Spinner from '../../../components/atoms/Spinner';
import Badge from '../../../components/atoms/Badge';
import api from '../../../services/api';

function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [recentPackages, setRecentPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pkgRes, routesRes, vehiclesRes, driversRes] = await Promise.all([
          api.get('/logistics/packages'),
          api.get('/logistics/routes'),
          api.get('/fleet/vehicles'),
          api.get('/fleet/drivers'),
        ]);

        const packages = pkgRes.data || [];
        const routes = routesRes.data || [];
        const vehicles = vehiclesRes.data || [];
        const drivers = driversRes.data || [];

        setStats({
          totalPackages: packages.length,
          activeRoutes: routes.filter((r) => r.status === 'active').length,
          totalVehicles: vehicles.length,
          totalDrivers: drivers.length,
        });

        setRecentPackages(packages.slice(0, 5));
      } catch (err) {
        console.error('Error cargando dashboard:', err);
        setStats({ totalPackages: 0, activeRoutes: 0, totalVehicles: 0, totalDrivers: 0 });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <Spinner size="lg" />;

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard label="Paquetes Totales" value={stats.totalPackages} />
        <StatCard label="Rutas Activas" value={stats.activeRoutes} />
        <StatCard label="Vehículos" value={stats.totalVehicles} />
        <StatCard label="Conductores" value={stats.totalDrivers} />
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-surface-800 mb-4">Paquetes Recientes</h2>
        {recentPackages.length === 0 ? (
          <p className="text-sm text-surface-400">No hay paquetes registrados aún.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {recentPackages.map((pkg) => (
              <div key={pkg.id} className="flex items-center justify-between p-3 bg-surface-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-surface-800">{pkg.tracking_code}</p>
                  <p className="text-xs text-surface-400">{pkg.origen} → {pkg.destino}</p>
                </div>
                <Badge variant={pkg.status === 'delivered' ? 'success' : pkg.status === 'in_transit' ? 'info' : 'warning'}>
                  {pkg.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;
