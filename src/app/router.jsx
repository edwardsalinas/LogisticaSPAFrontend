import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import DashboardLayout from '../components/templates/DashboardLayout';
import Spinner from '../components/atoms/Spinner';

// Lazy loading para páginas (code-splitting)
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

// Loading fallback component
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50">
      <Spinner size="lg" />
    </div>
  );
}

// Componente para proteger rutas privadas
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
