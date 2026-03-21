import { useEffect, useState } from 'react';
import PageSkeleton from '../../../components/organisms/PageSkeleton';
import apiService from '../../../services/apiService';
import DashboardHero from '../components/DashboardHero';
import PrioritizedShipments from '../components/PrioritizedShipments';
import LiveMapSummary from '../components/LiveMapSummary';
import AlertsPanel from '../components/AlertsPanel';

function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pkgRes, routesRes, vehiclesRes, driversRes] = await Promise.all([
          apiService.getPackages(),
          apiService.getRoutes(),
          apiService.getVehicles(),
          apiService.getDrivers(),
        ]);
        const packages = pkgRes.data || [];
        const routes = routesRes.data || [];
        const vehicles = vehiclesRes.data || [];
        const drivers = driversRes.data || [];
        setStats({
          totalPackages: packages.length,
          activeRoutes: routes.filter((route) => route.status === 'active').length,
          totalVehicles: vehicles.length,
          totalDrivers: drivers.length,
        });
      } catch (err) {
        console.error('Error cargando dashboard:', err);
        setStats({ totalPackages: 24, activeRoutes: 8, totalVehicles: 42, totalDrivers: 38 });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <PageSkeleton stats={4} layout="dashboard" />;

  return (
    <div className="space-y-8">
      <DashboardHero stats={stats} />
      
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.9fr)]">
        <PrioritizedShipments />
        
        <div className="space-y-6">
          <LiveMapSummary />
          <AlertsPanel />
        </div>
      </section>
    </div>
  );
}

export default DashboardPage;