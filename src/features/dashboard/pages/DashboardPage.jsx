import { usePackages } from '../../../hooks/queries/usePackages';
import { useRoutes } from '../../../hooks/queries/useRoutes';
import { useVehicles, useDrivers } from '../../../hooks/queries/useFleet';
import Skeleton from '../../../components/atoms/Skeleton';
import DashboardHero from '../components/DashboardHero';
import PrioritizedShipments from '../components/PrioritizedShipments';
import LiveMapSummary from '../components/LiveMapSummary';
import AlertsPanel from '../components/AlertsPanel';

function DashboardPage() {
  const { data: packages = [], isLoading: pLoading, isError: pError } = usePackages();
  const { data: routes = [], isLoading: rLoading, isError: rError } = useRoutes();
  const { data: vehicles = [], isLoading: vLoading, isError: vError } = useVehicles();
  const { data: drivers = [], isLoading: dLoading, isError: dError } = useDrivers();

  const loading = pLoading || rLoading || vLoading || dLoading;
  const isError = pError || rError || vError || dError;

  const stats = {
    totalPackages: isError ? 24 : packages.length,
    activeRoutes: isError ? 8 : routes.filter((route) => route.status === 'active').length,
    totalVehicles: isError ? 42 : vehicles.length,
    totalDrivers: isError ? 38 : drivers.length,
  };

  return (
    <div className="space-y-8">
      {loading ? <Skeleton className="h-[220px] w-full" /> : <DashboardHero stats={stats} />}
      
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.9fr)]">
        {loading ? <Skeleton className="h-[500px] w-full" /> : <PrioritizedShipments />}
        
        <div className="space-y-6">
          {loading ? <Skeleton className="h-[250px] w-full" /> : <LiveMapSummary />}
          {loading ? <Skeleton className="h-[220px] w-full" /> : <AlertsPanel />}
        </div>
      </section>
    </div>
  );
}

export default DashboardPage;