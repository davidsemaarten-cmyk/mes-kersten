/**
 * useProjects Hook
 * Phase 1.1: Projects and Fases
 *
 * React Query hooks for project and fase management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { toast } from 'sonner'

// =====================================================
// Types
// =====================================================

export interface Project {
  id: string
  code: string
  naam: string
  beschrijving: string | null
  status: 'actief' | 'afgerond' | 'geannuleerd'
  created_by: string
  created_at: string
  updated_at: string
  is_active: boolean
  fase_count: number
}

export interface ProjectWithFases extends Project {
  fases: Fase[]
}

export interface Fase {
  id: string
  project_id: string
  fase_nummer: string
  beschrijving: string | null
  opmerkingen_intern: string | null
  opmerkingen_werkplaats: string | null
  montage_datum: string | null
  status: 'actief' | 'gereed' | 'gearchiveerd'
  created_by: string
  created_at: string
  updated_at: string
  full_code?: string
  order_count: number
  posnummer_count: number
  file_count: number
}

export interface FaseWithProject extends Fase {
  project: Project | null
}

export interface ProjectCreate {
  code: string
  naam: string
  beschrijving?: string
}

export interface ProjectUpdate {
  naam?: string
  beschrijving?: string
  status?: 'actief' | 'afgerond' | 'geannuleerd'
}

export interface FaseCreate {
  project_id: string
  fase_nummer: string
  beschrijving?: string
  opmerkingen_intern?: string
  opmerkingen_werkplaats?: string
  montage_datum?: string
}

export interface FaseUpdate {
  beschrijving?: string
  opmerkingen_intern?: string
  opmerkingen_werkplaats?: string
  montage_datum?: string
  status?: 'actief' | 'gereed' | 'gearchiveerd'
}

// =====================================================
// Query Keys
// =====================================================

export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters?: { status?: string; search?: string }) =>
    [...projectKeys.lists(), filters] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
  detailByCode: (code: string) => [...projectKeys.details(), 'code', code] as const,
  statistics: (id: string) => [...projectKeys.detail(id), 'statistics'] as const,
  fases: (projectId: string) => [...projectKeys.detail(projectId), 'fases'] as const,
}

export const faseKeys = {
  all: ['fases'] as const,
  details: () => [...faseKeys.all, 'detail'] as const,
  detail: (id: string) => [...faseKeys.details(), id] as const,
  statistics: (id: string) => [...faseKeys.detail(id), 'statistics'] as const,
}

// =====================================================
// Project Hooks
// =====================================================

/**
 * Fetch list of projects with optional filters
 */
export function useProjects(filters?: { status?: string; search?: string }) {
  return useQuery({
    queryKey: projectKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.status) params.append('status_filter', filters.status)
      if (filters?.search) params.append('search', filters.search)

      const response = await api.get<Project[]>(`/api/projects?${params}`)
      return response.data
    },
  })
}

/**
 * Fetch single project by ID
 */
export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: projectKeys.detail(projectId || ''),
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required')
      const response = await api.get<ProjectWithFases>(`/api/projects/${projectId}`)
      return response.data
    },
    enabled: !!projectId,
  })
}

/**
 * Fetch single project by code
 */
export function useProjectByCode(code: string | undefined) {
  return useQuery({
    queryKey: projectKeys.detailByCode(code || ''),
    queryFn: async () => {
      if (!code) throw new Error('Project code is required')
      const response = await api.get<ProjectWithFases>(`/api/projects/code/${code}`)
      return response.data
    },
    enabled: !!code,
  })
}

/**
 * Create new project
 */
export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ProjectCreate) => {
      const response = await api.post<Project>('/api/projects', data)
      return response.data
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
      toast.success(`Project ${project.code} aangemaakt`)
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Fout bij aanmaken project'
      toast.error(message)
    },
  })
}

/**
 * Update existing project
 */
export function useUpdateProject(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ProjectUpdate) => {
      const response = await api.put<Project>(`/api/projects/${projectId}`, data)
      return response.data
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) })
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
      toast.success('Project bijgewerkt')
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Fout bij bijwerken project'
      toast.error(message)
    },
  })
}

/**
 * Delete project (soft delete)
 */
export function useDeleteProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (projectId: string) => {
      await api.delete(`/api/projects/${projectId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
      toast.success('Project verwijderd')
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Fout bij verwijderen project'
      toast.error(message)
    },
  })
}

/**
 * Get project statistics
 */
export function useProjectStatistics(projectId: string | undefined) {
  return useQuery({
    queryKey: projectKeys.statistics(projectId || ''),
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required')
      const response = await api.get(`/api/projects/${projectId}/statistics`)
      return response.data
    },
    enabled: !!projectId,
  })
}

// =====================================================
// Fase Hooks
// =====================================================

/**
 * Fetch fases for a project
 */
export function useFases(projectId: string | undefined) {
  return useQuery({
    queryKey: projectKeys.fases(projectId || ''),
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required')
      const response = await api.get<Fase[]>(`/api/projects/${projectId}/fases`)
      return response.data
    },
    enabled: !!projectId,
  })
}

/**
 * Fetch single fase by ID
 */
export function useFase(faseId: string | undefined) {
  return useQuery({
    queryKey: faseKeys.detail(faseId || ''),
    queryFn: async () => {
      if (!faseId) throw new Error('Fase ID is required')
      const response = await api.get<FaseWithProject>(`/api/fases/${faseId}`)
      return response.data
    },
    enabled: !!faseId,
  })
}

/**
 * Create new fase
 */
export function useCreateFase(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: FaseCreate) => {
      const response = await api.post<Fase>(`/api/projects/${projectId}/fases`, data)
      return response.data
    },
    onSuccess: (fase) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.fases(projectId) })
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) })
      toast.success(`Fase ${fase.fase_nummer} aangemaakt`)
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Fout bij aanmaken fase'
      toast.error(message)
    },
  })
}

/**
 * Update existing fase
 */
export function useUpdateFase(faseId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: FaseUpdate) => {
      const response = await api.put<Fase>(`/api/fases/${faseId}`, data)
      return response.data
    },
    onSuccess: (fase) => {
      queryClient.invalidateQueries({ queryKey: faseKeys.detail(faseId) })
      queryClient.invalidateQueries({ queryKey: projectKeys.fases(fase.project_id) })
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(fase.project_id) })
      toast.success('Fase bijgewerkt')
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Fout bij bijwerken fase'
      toast.error(message)
    },
  })
}

/**
 * Get fase statistics
 */
export function useFaseStatistics(faseId: string | undefined) {
  return useQuery({
    queryKey: faseKeys.statistics(faseId || ''),
    queryFn: async () => {
      if (!faseId) throw new Error('Fase ID is required')
      const response = await api.get(`/api/fases/${faseId}/statistics`)
      return response.data
    },
    enabled: !!faseId,
  })
}
