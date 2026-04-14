/**
 * React Query hooks for fase-level file management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'

export interface FaseFile {
  id: string
  fase_id: string
  filename: string
  file_path: string
  file_type: string | null
  file_size: number | null
  uploaded_by: string | null
  created_at: string
  uploader_name: string | null
}

export function useFaseFiles(faseId: string | undefined) {
  return useQuery({
    queryKey: ['fase-files', faseId],
    queryFn: async () => {
      if (!faseId) return []
      const response = await api.get<FaseFile[]>(`/api/fases/${faseId}/files`)
      return response.data
    },
    enabled: !!faseId,
  })
}

export function useUploadFaseFile(faseId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const response = await api.post<FaseFile>(
        `/api/fases/${faseId}/files`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['fase-files', faseId] })
      queryClient.invalidateQueries({ queryKey: ['faseStatistics', faseId] })
      toast.success(`Bestand "${data.filename}" geüpload`)
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Fout bij uploaden bestand'
      toast.error(message)
    },
  })
}

export function useDeleteFaseFile(faseId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (fileId: string) => {
      await api.delete(`/api/fase-files/${fileId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fase-files', faseId] })
      queryClient.invalidateQueries({ queryKey: ['faseStatistics', faseId] })
      toast.success('Bestand verwijderd')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Fout bij verwijderen bestand'
      toast.error(message)
    },
  })
}

export function getFaseFileDownloadUrl(fileId: string): string {
  return `/api/fase-files/${fileId}/download`
}
