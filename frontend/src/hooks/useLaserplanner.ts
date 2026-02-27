import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { toast } from 'sonner'
import { LaserJob, LaserJobWithLineItems, CSVParseResult } from '../types/database'

// ============================================================
// QUERY HOOKS
// ============================================================

export function useLaserJobs(statusFilter?: string) {
  return useQuery({
    queryKey: ['laser-jobs', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter) params.append('status_filter', statusFilter)
      const response = await api.get<LaserJob[]>(
        `/api/laserplanner/jobs?${params.toString()}`
      )
      return response.data
    }
  })
}

export function useLaserJob(jobId: string | undefined) {
  return useQuery({
    queryKey: ['laser-job', jobId],
    queryFn: async () => {
      if (!jobId) return null
      const response = await api.get<LaserJobWithLineItems>(
        `/api/laserplanner/jobs/${jobId}`
      )
      return response.data
    },
    enabled: !!jobId
  })
}

// ============================================================
// MUTATION HOOKS
// ============================================================

export function useCreateLaserJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      naam: string
      beschrijving?: string
      project_id?: string
      fase_id?: string
    }) => {
      const response = await api.post<LaserJob>('/api/laserplanner/jobs', data)
      return response.data
    },
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: ['laser-jobs'] })
      toast.success(`Job "${job.naam}" aangemaakt`)
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Fout bij aanmaken job'
      toast.error(message)
    }
  })
}

export function useUpdateJobStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ jobId, status }: { jobId: string; status: string }) => {
      const response = await api.patch<LaserJob>(
        `/api/laserplanner/jobs/${jobId}/status?status=${status}`
      )
      return response.data
    },
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: ['laser-jobs'] })
      queryClient.invalidateQueries({ queryKey: ['laser-job', job.id] })
      toast.success('Status bijgewerkt')
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Fout bij updaten status'
      toast.error(message)
    }
  })
}

export function useParseCSV() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const response = await api.post<CSVParseResult>(
        '/api/laserplanner/csv/parse',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      return response.data
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Fout bij inlezen CSV'
      toast.error(message)
    }
  })
}

export function useAddLineItems() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      jobId,
      selectedRows,
      csvMetadata,
      allRows
    }: {
      jobId: string
      selectedRows: number[]
      csvMetadata: Record<string, string>
      allRows: any[]
    }) => {
      const response = await api.post<LaserJobWithLineItems>(
        `/api/laserplanner/jobs/${jobId}/line-items`,
        {
          selection: { selected_row_numbers: selectedRows },
          csv_metadata: csvMetadata,
          all_rows: allRows
        }
      )
      return response.data
    },
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: ['laser-jobs'] })
      queryClient.invalidateQueries({ queryKey: ['laser-job', job.id] })
      toast.success(`${job.line_item_count} regels toegevoegd`)
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Fout bij toevoegen regels'
      toast.error(message)
    }
  })
}

export function useDeleteJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (jobId: string) => {
      await api.delete(`/api/laserplanner/jobs/${jobId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['laser-jobs'] })
      toast.success('Job verwijderd')
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Fout bij verwijderen job'
      toast.error(message)
    }
  })
}
