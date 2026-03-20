import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import SectionLoader from '../components/molecules/SectionLoader';
import DashboardLayout from '../components/templates/DashboardLayout';
import { useAuth } from './AuthContext';

const DashboardPage = lazy(() => import('../features/dashboard/pages/DashboardPage'));
const PackagesPage = lazy(() => import('../features/logistics/pages/PackagesPage'));
const PackageDetailPage = lazy(() => import('../features/logistics/pages/PackageDetailPage'));
const RoutesPage = lazy(() => import('../features/logistics/pages/RoutesPage'));
const RouteMapPage = lazy(() => import('../features/logistics/pages/RouteMapPage'));
const TrackingPage = lazy(() => import('../features/tracking/pages/TrackingPage'));
const PackageMapPage = lazy(() => import('../features/tracking/pages/PackageMapPage'));
const FleetPage = lazy(() => import('../features/fleet/pages/FleetPage'));
const AiChatPage = lazy(() => import('../features/ai-chat/pages/AiChatPage'));
const AnalyticsPage = lazy(() => import('../features/analytics/pages/AnalyticsPage'));
const LoginPage = lazy(() => import('../features/auth/pages/LoginPage'));

function PageLoader() {
  return (
    <div className="min-h-screen bg-surface-50 px-4 py-8 sm:px-6">
      <SectionLoader
        eyebrow="Cargando modulo"
        title="Preparando la vista"
        description="Estamos montando el modulo solicitado y sus datos operativos."
        className="min-h-[calc(100vh-4rem)]"
      />
    </div>
  );
}

function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/logistics/packages" element={<PackagesPage />} />
            <Route path="/logistics/packages/:packageId" element={<PackageDetailPage />} />
            <Route path="/logistics/routes" element={<RoutesPage />} />
            <Route path="/logistics/routes/:routeId/map" element={<RouteMapPage />} />
            <Route path="/tracking" element={<TrackingPage />} />
            <Route path="/tracking/:packageId/map" element={<PackageMapPage />} />
            <Route path="/fleet" element={<FleetPage />} />
            <Route path="/ai-chat" element={<AiChatPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default AppRouter;
