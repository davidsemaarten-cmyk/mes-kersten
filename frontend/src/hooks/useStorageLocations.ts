import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export interface StorageLocation {
  id: string;
  naam: string;
  beschrijving?: string;
  actief: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateStorageLocationData {
  naam: string;
  beschrijving?: string;
}

export interface UpdateStorageLocationData {
  naam?: string;
  beschrijving?: string;
  actief?: boolean;
}

export function useStorageLocations(includeInactive = false) {
  return useQuery({
    queryKey: ['storage-locations', includeInactive],
    queryFn: async () => {
      const response = await api.get<StorageLocation[]>('/api/storage-locations/', {
        params: { include_inactive: includeInactive }
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateStorageLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateStorageLocationData) => {
      const response = await api.post<StorageLocation>('/api/storage-locations/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-locations'] });
      toast.success('Locatie succesvol aangemaakt');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Fout bij aanmaken locatie';
      toast.error(message);
    }
  });
}

export function useUpdateStorageLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateStorageLocationData }) => {
      const response = await api.put<StorageLocation>(`/api/storage-locations/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-locations'] });
      toast.success('Locatie succesvol bijgewerkt');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Fout bij bijwerken locatie';
      toast.error(message);
    }
  });
}

export function useDeleteStorageLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/storage-locations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-locations'] });
      toast.success('Locatie succesvol verwijderd');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Fout bij verwijderen locatie';
      toast.error(message);
    }
  });
}
