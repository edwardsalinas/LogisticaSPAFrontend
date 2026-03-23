import { useQuery } from '@tanstack/react-query';
import apiService from '../../services/apiService';

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await apiService.getDashboardStats();
      return response.data;
    },
    refetchInterval: 30000, // Refrescar cada 30 segundos
  });
};
