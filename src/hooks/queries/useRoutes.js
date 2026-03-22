import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '../../services/apiService';

export const routeKeys = {
  all: ['routes'],
  detail: (id) => ['routes', id],
  checkpoints: (id) => ['routes', id, 'checkpoints'],
};

export function useRoutes() {
  return useQuery({
    queryKey: routeKeys.all,
    queryFn: async () => {
      const response = await apiService.getRoutes();
      return response.data || response;
    },
  });
}

export function useRoute(routeId) {
  return useQuery({
    queryKey: routeKeys.detail(routeId),
    queryFn: async () => {
      const response = await apiService.getRoute(routeId);
      return response.data || response;
    },
    enabled: !!routeId,
  });
}

export function useCheckpoints(routeId) {
  return useQuery({
    queryKey: routeKeys.checkpoints(routeId),
    queryFn: async () => {
      const response = await apiService.getCheckpointsByRoute(routeId);
      return response.data || response;
    },
    enabled: !!routeId,
  });
}

export function useCreateRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => apiService.createRoute(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: routeKeys.all });
    },
  });
}
