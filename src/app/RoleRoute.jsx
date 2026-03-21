import { Navigate } from 'react-router-dom';
import { useRole } from './useRole';

// Componente Wrapper para proteger rutas por rol
const RoleRoute = ({ children, roles }) => {
  const { role, hasRole } = useRole();

  if (!hasRole(roles)) {
    // Redirigir dependiendo del rol si intentan acceder a un lugar prohibido
    if (role === 'driver') {
      return <Navigate to="/driver" replace />;
    }
    if (role === 'client') {
      return <Navigate to="/logistics/packages" replace />;
    }
    // Admin o operator por defecto al dashboard o home
    return <Navigate to="/" replace />;
  }

  return children;
};

export default RoleRoute;
