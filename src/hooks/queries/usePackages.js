import { useQuery } from '@tanstack/react-query';
import apiService from '../../services/apiService';

export const packageKeys = {
  all: ['packages'],
  detail: (id) => ['packages', id],
};

export function usePackages() {
  return useQuery({
    queryKey: packageKeys.all,
    queryFn: async () => {
      const response = await apiService.getPackages();
      return response.data || response; // Handle both mock formats
    },
  });
}

// Para obtener un solo paquete si hiciera falta
export function usePackage(packageId) {
  return useQuery({
    queryKey: packageKeys.detail(packageId),
    queryFn: async () => {
      const response = await apiService.get(`/logistics/packages/${packageId}`);
      return response.data || response;
    },
    enabled: !!packageId,
  });
}
