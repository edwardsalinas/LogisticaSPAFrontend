import { usePackages } from '../../../hooks/queries/usePackages';
import { useRoutes } from '../../../hooks/queries/useRoutes';
import { useVehicles, useDrivers } from '../../../hooks/queries/useFleet';
import { useDashboardStats } from '../../../hooks/queries/useStatistics';
import Skeleton from '../../../components/atoms/Skeleton';
import DashboardHero from '../components/DashboardHero';
import PrioritizedShipments from '../components/PrioritizedShipments';
import LiveMapSummary from '../components/LiveMapSummary';
import AlertsPanel from '../components/AlertsPanel';

function DashboardPage() {
  const { data: stats, isLoading, isError } = useDashboardStats();

  if (isLoading) return <Skeleton className="h-[220px] w-full" />;
  if (isError) return <div className="p-8 text-center text-red-500">Error al cargar estadísticas</div>;

  return (
    <div className="space-y-8 text-slate-800">
      <DashboardHero stats={stats} />
      
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.9fr)]">
        <PrioritizedShipments />
        
        <div className="space-y-6">
          <LiveMapSummary stats={stats} />
          <AlertsPanel stats={stats} />
        </div>
      </section>
    </div>
  );
}

export default DashboardPage;