import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '../../services/apiService';

export const fleetKeys = {
  vehicles: ['vehicles'],
  drivers: ['drivers'],
};

export function useVehicles() {
  return useQuery({
    queryKey: fleetKeys.vehicles,
    queryFn: async () => {
      const response = await apiService.getVehicles();
      return response.data || response;
    },
  });
}

export function useDrivers() {
  return useQuery({
    queryKey: fleetKeys.drivers,
    queryFn: async () => {
      const response = await apiService.getDrivers();
      return response.data || response;
    },
  });
}
