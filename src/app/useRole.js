import { useAuth } from './AuthContext';

export const useRole = () => {
  const { user } = useAuth();
  
  // Extraemos el rol. Por defecto asumimos 'client' si no hay rol definido para evitar errores,
  // pero idealmente todos deberían tener un rol en su user_metadata.
  const role = user?.user_metadata?.role || 'client';

  const hasRole = (allowedRoles) => allowedRoles.includes(role);

  return {
    role,
    hasRole,
    isAdmin: role === 'admin',
    isLogisticsOperator: role === 'logistics_operator',
    isDriver: role === 'driver',
    isClient: role === 'client'
  };
};

export default useRole;
