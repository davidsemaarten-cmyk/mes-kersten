/**
 * Hooks for admin user management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { toast } from 'sonner'
import type { UserCreateAdmin, UserUpdateAdmin, UserAdminResponse } from '../types/database'

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<UserAdminResponse[]>('/api/users/').then(r => r.data),
    staleTime: 60_000,
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UserCreateAdmin) =>
      api.post<UserAdminResponse>('/api/users/', data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Gebruiker aangemaakt')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Fout bij aanmaken gebruiker')
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UserUpdateAdmin }) =>
      api.put<UserAdminResponse>(`/api/users/${id}`, data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Gebruiker bijgewerkt')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Fout bij bijwerken gebruiker')
    },
  })
}

export function useDeactivateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.put<UserAdminResponse>(`/api/users/${id}/deactivate`).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Gebruiker gedeactiveerd')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Fout bij deactiveren gebruiker')
    },
  })
}
