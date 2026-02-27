/**
 * PlateStock custom hooks using TanStack Query
 * Following PROJECT-MASTER.md patterns
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { toast } from 'sonner'
import type {
  Material, MaterialCreate, MaterialUpdate,
  PrefixSuggestionRequest, PrefixSuggestionResponse,
  Plate, PlateCreate, PlateUpdate, PlateWithRelations,
  Claim, ClaimCreate, ClaimUpdate, ClaimWithPlate,
  ClaimBulkCreate, BulkClaimResponse,
  ReleaseByProjectRequest, ReleaseByProjectResponse,
  OverviewStats, ProjectsStatsResponse,
  VanLaserRequest
} from '../types/database'

// ============================================================
// MATERIALS HOOKS
// ============================================================

export function useMaterials(filters?: {
  materiaalgroep?: string
  specificatie?: string
  oppervlaktebewerking?: string
}) {
  return useQuery({
    queryKey: ['materials', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.materiaalgroep) params.append('materiaalgroep', filters.materiaalgroep)
      if (filters?.specificatie) params.append('specificatie', filters.specificatie)
      if (filters?.oppervlaktebewerking) params.append('oppervlaktebewerking', filters.oppervlaktebewerking)
      
      const response = await api.get<Material[]>(`/api/platestock/materials?${params}`)
      return response.data
    }
  })
}

export function usePrefixSuggestion() {
  return useMutation({
    mutationFn: async (params: PrefixSuggestionRequest) => {
      const response = await api.post<PrefixSuggestionResponse>(
        '/api/platestock/materials/suggest-prefix', 
        params
      )
      return response.data
    }
  })
}

export function useCreateMaterial() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: MaterialCreate) => {
      const response = await api.post<Material>('/api/platestock/materials', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      toast.success('Materiaal toegevoegd')
    },
    onError: (error: any) => {
      // Safely extract error message from various error formats
      let errorMessage = 'Fout bij toevoegen materiaal'

      if (error.response?.data) {
        const data = error.response.data

        // Case 1: Standard HTTP error format {detail: "string"}
        if (typeof data.detail === 'string') {
          errorMessage = data.detail
        }
        // Case 2: Validation error format {detail: "msg", errors: [...]}
        else if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
          const firstError = data.errors[0]
          const fieldName = firstError.loc?.[firstError.loc.length - 1] || 'veld'
          errorMessage = `Validatie fout bij ${fieldName}: ${firstError.msg}`
        }
        // Case 3: Direct string response
        else if (typeof data === 'string') {
          errorMessage = data
        }
      } else if (error.message) {
        // Network error or other Axios error
        errorMessage = error.message
      }

      toast.error(errorMessage)
    }
  })
}

export function useUpdateMaterial() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: MaterialUpdate }) => {
      const response = await api.put<Material>(`/api/platestock/materials/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      queryClient.invalidateQueries({ queryKey: ['plates'] })
      toast.success('Materiaal bijgewerkt')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Fout bij bijwerken materiaal')
    }
  })
}

export function useDeleteMaterial() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/platestock/materials/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      toast.success('Materiaal verwijderd')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Fout bij verwijderen materiaal')
    }
  })
}

// ============================================================
// PLATES HOOKS
// ============================================================

export function usePlates(options?: {
  include_consumed?: boolean
  location?: string
  material_prefix?: string
}) {
  return useQuery({
    queryKey: ['plates', options],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (options?.include_consumed) params.append('include_consumed', 'true')
      if (options?.location) params.append('location', options.location)
      if (options?.material_prefix) params.append('material_prefix', options.material_prefix)

      const response = await api.get<PlateWithRelations[]>(
        `/api/platestock/plates?${params.toString()}`
      )
      return response.data
    }
  })
}

export function usePlate(id: string) {
  return useQuery({
    queryKey: ['plate', id],
    queryFn: async () => {
      const response = await api.get<PlateWithRelations>(`/api/platestock/plates/${id}`)
      return response.data
    },
    enabled: !!id
  })
}

export function useCreatePlates() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ data, aantal }: { data: PlateCreate; aantal: number }) => {
      const response = await api.post<Plate[]>(
        `/api/platestock/plates?aantal=${aantal}`,
        data
      )
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['plates'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      toast.success(`${data.length} ${data.length === 1 ? 'plaat' : 'platen'} toegevoegd`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Fout bij toevoegen platen')
    }
  })
}

export function useUpdatePlate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PlateUpdate }) => {
      const response = await api.put<Plate>(`/api/platestock/plates/${id}`, data)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['plates'] })
      queryClient.invalidateQueries({ queryKey: ['plate', data.id] })
      toast.success('Plaat bijgewerkt')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Fout bij bijwerken plaat')
    }
  })
}

export function useDeletePlate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/platestock/plates/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plates'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      toast.success('Plaat verwijderd')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Fout bij verwijderen plaat')
    }
  })
}

export function useMoveToLaser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<Plate>(`/api/platestock/plates/${id}/naar-laser`)
      return response.data
    },
    onSuccess: async () => {
      // Wait for queries to refetch before showing success
      await queryClient.invalidateQueries({ queryKey: ['plates'] })
      await queryClient.invalidateQueries({ queryKey: ['stats'] })
      toast.success('Plaat naar laser verplaatst')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Fout bij verplaatsen naar laser')
    }
  })
}

export function useMoveFromLaser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: VanLaserRequest }) => {
      const response = await api.post<Plate>(`/api/platestock/plates/${id}/van-laser`, data)
      return response.data
    },
    onSuccess: async () => {
      // Wait for queries to refetch before showing success
      await queryClient.invalidateQueries({ queryKey: ['plates'] })
      await queryClient.invalidateQueries({ queryKey: ['stats'] })
      toast.success('Plaat van laser gehaald')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Fout bij verplaatsen van laser')
    }
  })
}

export function useConsumePlate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<Plate>(`/api/platestock/plates/${id}/consume`)
      return response.data
    },
    onSuccess: async () => {
      // Wait for queries to refetch before showing success
      await queryClient.invalidateQueries({ queryKey: ['plates'] })
      await queryClient.invalidateQueries({ queryKey: ['claims'] })
      await queryClient.invalidateQueries({ queryKey: ['stats'] })
      toast.success('Plaat geconsumeerd')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Fout bij consumeren plaat')
    }
  })
}

// ============================================================
// CLAIMS HOOKS
// ============================================================

export function useClaims(options?: {
  actief?: boolean
  project_naam?: string
  project_fase?: string
}) {
  return useQuery({
    queryKey: ['claims', options],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (options?.actief !== undefined) params.append('actief', String(options.actief))
      if (options?.project_naam) params.append('project_naam', options.project_naam)
      if (options?.project_fase) params.append('project_fase', options.project_fase)

      const response = await api.get<ClaimWithPlate[]>(
        `/api/platestock/claims?${params.toString()}`
      )
      return response.data
    }
  })
}

export function useCreateClaim() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ClaimCreate) => {
      const response = await api.post<Claim>('/api/platestock/claims', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims'] })
      queryClient.invalidateQueries({ queryKey: ['plates'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      toast.success('Claim aangemaakt')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Fout bij aanmaken claim')
    }
  })
}

export function useBulkClaim() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ClaimBulkCreate) => {
      const response = await api.post<BulkClaimResponse>('/api/platestock/claims/bulk', data)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['claims'] })
      queryClient.invalidateQueries({ queryKey: ['plates'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      toast.success(
        `${data.claims.length} platen geclaimd (${data.total_m2.toFixed(2)} m²)`
      )
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Fout bij bulk claimen')
    }
  })
}

export function useUpdateClaim() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ClaimUpdate }) => {
      const response = await api.put<Claim>(`/api/platestock/claims/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims'] })
      toast.success('Claim bijgewerkt')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Fout bij bijwerken claim')
    }
  })
}

export function useReleaseClaim() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/platestock/claims/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims'] })
      queryClient.invalidateQueries({ queryKey: ['plates'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      toast.success('Claim vrijgegeven')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Fout bij vrijgeven claim')
    }
  })
}

export function useReleaseByProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ReleaseByProjectRequest) => {
      const response = await api.post<ReleaseByProjectResponse>(
        '/api/platestock/claims/release-by-project',
        data
      )
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['claims'] })
      queryClient.invalidateQueries({ queryKey: ['plates'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      toast.success(
        `${data.claims_released} claims vrijgegeven, ${data.plates_freed} platen beschikbaar`
      )
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Fout bij vrijgeven claims')
    }
  })
}

// ============================================================
// STATISTICS HOOKS
// ============================================================

export function useOverviewStats() {
  return useQuery({
    queryKey: ['stats', 'overview'],
    queryFn: async () => {
      const response = await api.get<OverviewStats>('/api/platestock/stats/overview')
      return response.data
    }
  })
}

export function useProjectStats() {
  return useQuery({
    queryKey: ['stats', 'projects'],
    queryFn: async () => {
      const response = await api.get<ProjectsStatsResponse>('/api/platestock/stats/projects')
      return response.data
    }
  })
}
