import { useAuth } from './AuthContext';

/**
 * Rol del usuario para decidir qué interfaz mostrar.
 * La fuente confiable es `app_metadata.role` (solo la escribe el servidor). `user_metadata` lo puede
 * editar el propio usuario, así que solo se usa como respaldo mientras se migran los roles.
 * Importante: esto solo condiciona la UI; la autorización real la aplica siempre el backend.
 */
export const resolveUserRole = (user) => user?.app_metadata?.role || user?.user_metadata?.role || 'client';

export const useRole = () => {
  const { user } = useAuth();
  const role = resolveUserRole(user);

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
