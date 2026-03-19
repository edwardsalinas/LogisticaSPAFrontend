import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '../components/templates/DashboardLayout';

import DashboardPage from '../features/dashboard/pages/DashboardPage';
import PackagesPage from '../features/logistics/pages/PackagesPage';
import RoutesPage from '../features/logistics/pages/RoutesPage';
import TrackingPage from '../features/tracking/pages/TrackingPage';
import FleetPage from '../features/fleet/pages/FleetPage';
import AiChatPage from '../features/ai-chat/pages/AiChatPage';

function AppRouter() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/logistics/packages" element={<PackagesPage />} />
        <Route path="/logistics/routes" element={<RoutesPage />} />
        <Route path="/tracking" element={<TrackingPage />} />
        <Route path="/fleet" element={<FleetPage />} />
        <Route path="/ai-chat" element={<AiChatPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRouter;
