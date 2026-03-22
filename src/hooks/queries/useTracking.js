import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '../../services/apiService';

export const trackingKeys = {
  logs: (packageId) => ['tracking', packageId, 'logs'],
  mapData: (packageId) => ['tracking', packageId, 'mapData'],
};

export function useTrackingLogs(packageId) {
  return useQuery({
    queryKey: trackingKeys.logs(packageId),
    queryFn: async () => {
      const response = await apiService.getTrackingLogs(packageId);
      return response.data || response;
    },
    enabled: !!packageId,
  });
}

export function useMapData(packageId) {
  return useQuery({
    queryKey: trackingKeys.mapData(packageId),
    queryFn: async () => {
      const response = await apiService.getMapData(packageId);
      return response.data || response;
    },
    enabled: !!packageId,
  });
}

export function useCreateTrackingEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => apiService.createTrackingEvent(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: trackingKeys.logs(variables.package_id) });
    },
  });
}
