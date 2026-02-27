/**
 * React Query hooks for Posnummers (Part Numbers)
 * Provides data fetching and mutation for posnummers within fases
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  Posnummer,
  PosnummerCreate,
  PosnummerUpdate
} from '@/types/database'

// =====================================================
// Posnummer Queries
// =====================================================

export function usePosnummers(
  faseId: string | undefined,
  filters?: {
    materiaal?: string
    includeInactive?: boolean
  }
) {
  return useQuery({
    queryKey: ['posnummers', faseId, filters],
    queryFn: async () => {
      if (!faseId) throw new Error('No fase ID provided')
      const response = await api.get<Posnummer[]>(
        `/api/fases/${faseId}/posnummers`,
        { params: filters }
      )
      return response.data
    },
    enabled: !!faseId,
  })
}

// =====================================================
// Posnummer Mutations
// =====================================================

export function useCreatePosnummer(faseId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: PosnummerCreate) => {
      const response = await api.post<Posnummer>(
        `/api/fases/${faseId}/posnummers`,
        data
      )
      return response.data
    },
    onSuccess: () => {
      // Invalidate posnummers list for this fase
      queryClient.invalidateQueries({ queryKey: ['posnummers', faseId] })
      // Invalidate fase statistics
      queryClient.invalidateQueries({ queryKey: ['faseStatistics', faseId] })
    },
  })
}

export function useUpdatePosnummer(posnummerId: string, faseId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: PosnummerUpdate) => {
      const response = await api.put<Posnummer>(
        `/api/posnummers/${posnummerId}`,
        data
      )
      return response.data
    },
    onSuccess: () => {
      // Invalidate posnummers list
      queryClient.invalidateQueries({ queryKey: ['posnummers', faseId] })
    },
  })
}

export function useDeletePosnummer(faseId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (posnummerId: string) => {
      await api.delete(`/api/posnummers/${posnummerId}`)
    },
    onSuccess: () => {
      // Invalidate posnummers list
      queryClient.invalidateQueries({ queryKey: ['posnummers', faseId] })
      // Invalidate fase statistics
      queryClient.invalidateQueries({ queryKey: ['faseStatistics', faseId] })
    },
  })
}
