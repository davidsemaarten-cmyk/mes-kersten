import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { toast } from 'sonner'
import { LaserJob, LaserJobWithLineItems, LaserLineItem, CSVParseResult, LaserCSVImport, LaserCSVImportDetail, LaserDXFFile, LaserDXFFileDetail, DXFUploadResult, SingleDXFUploadResult, LaserPDFFile, PDFUploadPreviewResponse, PDFConfirmRequest, LaserNCFile, NCUploadResult, LaserStepFile, StepUploadResult } from '../types/database'

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
    },
    staleTime: 30_000, // 30s — status-gevoelige data
  })
}

export function useLaserJobsByFase(faseId: string | undefined) {
  return useQuery({
    queryKey: ['laser-jobs-by-fase', faseId],
    queryFn: async () => {
      if (!faseId) return []
      const response = await api.get<LaserJob[]>(
        `/api/laserplanner/jobs/by-fase/${faseId}`
      )
      return response.data
    },
    enabled: !!faseId,
    staleTime: 30_000,
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

export function useLaserCSVImports(jobId: string | undefined) {
  return useQuery({
    queryKey: ['laser-csv-imports', jobId],
    queryFn: async () => {
      if (!jobId) return []
      const response = await api.get<LaserCSVImport[]>(
        `/api/laserplanner/jobs/${jobId}/csv-imports`
      )
      return response.data
    },
    enabled: !!jobId,
    staleTime: 30_000, // 30s — status-gevoelige data
  })
}

export function useLaserCSVImportDetail(
  jobId: string | undefined,
  importId: string | undefined,
  enabled: boolean = false
) {
  return useQuery({
    queryKey: ['laser-csv-import-detail', jobId, importId],
    queryFn: async () => {
      if (!jobId || !importId) return null
      const response = await api.get<LaserCSVImportDetail>(
        `/api/laserplanner/jobs/${jobId}/csv-imports/${importId}`
      )
      return response.data
    },
    enabled: !!jobId && !!importId && enabled
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
      allRows,
      rawContent,
      originalFilename,
    }: {
      jobId: string
      selectedRows: number[]
      csvMetadata: Record<string, string>
      allRows: any[]
      rawContent: string
      originalFilename: string
    }) => {
      const response = await api.post<LaserJobWithLineItems>(
        `/api/laserplanner/jobs/${jobId}/line-items`,
        {
          selection: { selected_row_numbers: selectedRows },
          csv_metadata: csvMetadata,
          all_rows: allRows,
          raw_content: rawContent,
          original_filename: originalFilename,
        }
      )
      return response.data
    },
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: ['laser-jobs'] })
      queryClient.invalidateQueries({ queryKey: ['laser-job', job.id] })
      queryClient.invalidateQueries({ queryKey: ['laser-csv-imports', job.id] })
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

// ============================================================
// DXF FILE HOOKS
// ============================================================

export function useLaserDXFFiles(jobId: string | undefined) {
  return useQuery({
    queryKey: ['laser-dxf-files', jobId],
    queryFn: async () => {
      if (!jobId) return []
      const response = await api.get<LaserDXFFile[]>(
        `/api/laserplanner/jobs/${jobId}/dxf`
      )
      return response.data
    },
    enabled: !!jobId,
    staleTime: 30_000, // 30s — status-gevoelige data
  })
}

export function useLaserDXFFileDetail(
  jobId: string | undefined,
  dxfId: string | undefined,
  enabled: boolean = false
) {
  return useQuery({
    queryKey: ['laser-dxf-detail', jobId, dxfId],
    queryFn: async () => {
      if (!jobId || !dxfId) return null
      const response = await api.get<LaserDXFFileDetail>(
        `/api/laserplanner/jobs/${jobId}/dxf/${dxfId}`
      )
      return response.data
    },
    enabled: !!jobId && !!dxfId && enabled
  })
}

export function useUpdateLineItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      jobId,
      itemId,
      data,
    }: {
      jobId: string
      itemId: string
      data: { profiel?: string | null; kwaliteit?: string | null; aantal?: number | null; opmerkingen?: string | null }
    }) => {
      const response = await api.patch<LaserLineItem>(
        `/api/laserplanner/jobs/${jobId}/line-items/${itemId}`,
        data
      )
      return response.data
    },
    onSuccess: (_item, variables) => {
      queryClient.invalidateQueries({ queryKey: ['laser-job', variables.jobId] })
      toast.success('Regel bijgewerkt')
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Fout bij opslaan'
      toast.error(message)
    },
  })
}

export function useDeleteLineItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ jobId, itemId }: { jobId: string; itemId: string }) => {
      await api.delete(`/api/laserplanner/jobs/${jobId}/line-items/${itemId}`)
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['laser-job', variables.jobId] })
      queryClient.invalidateQueries({ queryKey: ['laser-dxf-files', variables.jobId] })
      toast.success('Regel verwijderd')
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Fout bij verwijderen'
      toast.error(message)
    },
  })
}

export function useCreateManualLineItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      jobId,
      data,
    }: {
      jobId: string
      data: { posnr?: string | null; profiel?: string | null; kwaliteit?: string | null; aantal?: number | null; opmerkingen?: string | null }
    }) => {
      const response = await api.post<LaserLineItem>(
        `/api/laserplanner/jobs/${jobId}/line-items/manual`,
        data
      )
      return response.data
    },
    onSuccess: (_item, variables) => {
      queryClient.invalidateQueries({ queryKey: ['laser-job', variables.jobId] })
      toast.success('Regel toegevoegd')
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Fout bij toevoegen'
      toast.error(message)
    },
  })
}

export function useDeleteDXFFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ jobId, dxfId }: { jobId: string; dxfId: string }) => {
      await api.delete(`/api/laserplanner/jobs/${jobId}/dxf/${dxfId}`)
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['laser-dxf-files', variables.jobId] })
      toast.success('DXF verwijderd')
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Fout bij verwijderen DXF'
      toast.error(message)
    },
  })
}

export function useUploadLinkedDXF() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ jobId, itemId, file }: { jobId: string; itemId: string; file: File }) => {
      const formData = new FormData()
      formData.append('file', file)
      const response = await api.post<SingleDXFUploadResult>(
        `/api/laserplanner/jobs/${jobId}/line-items/${itemId}/dxf`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      return response.data
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['laser-dxf-files', variables.jobId] })
      if (result.filename_mismatch) {
        toast.warning(`DXF gekoppeld — let op: bestandsnaam komt niet overeen met Posnr`)
      } else {
        toast.success('DXF gekoppeld')
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Fout bij uploaden DXF'
      toast.error(message)
    },
  })
}

export function useUploadDXFFiles() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      jobId,
      files,
      importId,
    }: {
      jobId: string
      files: File[]
      importId?: string
    }) => {
      const formData = new FormData()
      files.forEach((f) => formData.append('files', f))
      const params = importId ? `?import_id=${importId}` : ''
      const response = await api.post<DXFUploadResult>(
        `/api/laserplanner/jobs/${jobId}/dxf/upload${params}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      return response.data
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['laser-dxf-files', variables.jobId] })
      const m = result.matched.length
      const u = result.unmatched.length
      if (m > 0 && u === 0) {
        toast.success(`${m} DXF bestanden gekoppeld`)
      } else if (m > 0 && u > 0) {
        toast.success(`${m} gekoppeld, ${u} niet herkend: ${result.unmatched.join(', ')}`)
      } else {
        toast.warning(`Geen bestanden herkend: ${result.unmatched.join(', ')}`)
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Fout bij uploaden DXF'
      toast.error(message)
    }
  })
}

// ============================================================
// PDF DRAWING FILE HOOKS
// ============================================================

export function useLaserPDFFiles(jobId: string | undefined) {
  return useQuery({
    queryKey: ['laser-pdf-files', jobId],
    queryFn: async () => {
      if (!jobId) return []
      const response = await api.get<LaserPDFFile[]>(
        `/api/laserplanner/jobs/${jobId}/pdf`
      )
      return response.data
    },
    enabled: !!jobId,
    staleTime: 30_000, // 30s — status-gevoelige data
  })
}

export function useUploadPDF(jobId: string) {
  return useMutation({
    mutationFn: async ({ file }: { file: File }) => {
      const formData = new FormData()
      formData.append('file', file)
      const response = await api.post<PDFUploadPreviewResponse>(
        `/api/laserplanner/jobs/${jobId}/pdf/parse`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 180_000,  // 3 minutes — large multi-page PDFs can take a while
        }
      )
      return response.data
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Fout bij verwerken PDF'
      toast.error(message)
    },
  })
}

export function useConfirmPDF(jobId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: PDFConfirmRequest) => {
      const response = await api.post<LaserPDFFile[]>(
        `/api/laserplanner/jobs/${jobId}/pdf/confirm`,
        body
      )
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['laser-pdf-files', jobId] })
      toast.success(`${data.length} tekening${data.length !== 1 ? 'en' : ''} opgeslagen`)
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Fout bij opslaan tekeningen'
      toast.error(message)
    },
  })
}

export function useDeletePDFFile(jobId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (pdfId: string) => {
      await api.delete(`/api/laserplanner/jobs/${jobId}/pdf/${pdfId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['laser-pdf-files', jobId] })
      toast.success('Tekening verwijderd')
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Fout bij verwijderen tekening'
      toast.error(message)
    },
  })
}

// ============================================================
// ALMACAM EXPORT
// ============================================================

export function useExportAlmacam(jobId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const response = await api.get(
        `/api/laserplanner/jobs/${jobId}/export/almacam`,
        { responseType: 'blob' }
      )
      // Extract filename from Content-Disposition header
      const cd: string = response.headers['content-disposition'] ?? ''
      const match = cd.match(/filename="?([^";\r\n]+)"?/)
      const filename = match?.[1]?.trim() ?? `almacam_${jobId}.zip`
      // Trigger browser download
      const url = URL.createObjectURL(
        new Blob([response.data as BlobPart], { type: 'application/zip' })
      )
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['laser-job', jobId] })
      queryClient.invalidateQueries({ queryKey: ['laser-jobs'] })
      toast.success('ZIP gedownload met CSV en DXF-bestanden. Importeer in Almacam.')
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Fout bij exporteren naar Almacam'
      toast.error(message)
    },
  })
}

/** @deprecated Use useExportAlmacam instead */
export const useExportAlmacamCSV = useExportAlmacam

// ============================================================
// NC FILE HOOKS (DSTV .nc1)
// ============================================================

export function useLaserNCFiles(jobId: string | undefined) {
  return useQuery({
    queryKey: ['laser-nc-files', jobId],
    queryFn: async () => {
      if (!jobId) return []
      const response = await api.get<LaserNCFile[]>(
        `/api/laserplanner/jobs/${jobId}/nc`
      )
      return response.data
    },
    enabled: !!jobId,
    staleTime: 30_000,
  })
}

export function useUploadNCFiles() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ jobId, files }: { jobId: string; files: File[] }) => {
      const formData = new FormData()
      files.forEach((f) => formData.append('files', f))
      const response = await api.post<NCUploadResult>(
        `/api/laserplanner/jobs/${jobId}/nc/upload`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      return response.data
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['laser-nc-files', variables.jobId] })
      const m = result.matched.length
      const u = result.unmatched.length
      if (m > 0 && u === 0) {
        toast.success(`${m} NC ${m === 1 ? 'bestand' : 'bestanden'} gekoppeld`)
      } else if (m > 0 && u > 0) {
        toast.success(`${m} gekoppeld, ${u} niet herkend: ${result.unmatched.join(', ')}`)
      } else {
        toast.warning(`Geen bestanden herkend: ${result.unmatched.join(', ')}`)
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Fout bij uploaden NC bestanden')
    },
  })
}

export function useDeleteNCFile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ jobId, ncId }: { jobId: string; ncId: string }) => {
      await api.delete(`/api/laserplanner/jobs/${jobId}/nc/${ncId}`)
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['laser-nc-files', variables.jobId] })
      toast.success('NC bestand verwijderd')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Fout bij verwijderen NC bestand')
    },
  })
}

// ============================================================
// STEP FILE HOOKS (3D CAD .step/.stp)
// ============================================================

export function useLaserStepFiles(jobId: string | undefined) {
  return useQuery({
    queryKey: ['laser-step-files', jobId],
    queryFn: async () => {
      if (!jobId) return []
      const response = await api.get<LaserStepFile[]>(
        `/api/laserplanner/jobs/${jobId}/step`
      )
      return response.data
    },
    enabled: !!jobId,
    staleTime: 30_000,
  })
}

export function useUploadStepFiles() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ jobId, files }: { jobId: string; files: File[] }) => {
      const formData = new FormData()
      files.forEach((f) => formData.append('files', f))
      const response = await api.post<StepUploadResult>(
        `/api/laserplanner/jobs/${jobId}/step/upload`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      return response.data
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['laser-step-files', variables.jobId] })
      const m = result.matched.length
      const u = result.unmatched.length
      if (m > 0 && u === 0) {
        toast.success(`${m} STEP ${m === 1 ? 'bestand' : 'bestanden'} gekoppeld`)
      } else if (m > 0 && u > 0) {
        toast.success(`${m} gekoppeld, ${u} niet herkend: ${result.unmatched.join(', ')}`)
      } else {
        toast.warning(`Geen bestanden herkend: ${result.unmatched.join(', ')}`)
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Fout bij uploaden STEP bestanden')
    },
  })
}

export function useDeleteStepFile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ jobId, stepId }: { jobId: string; stepId: string }) => {
      await api.delete(`/api/laserplanner/jobs/${jobId}/step/${stepId}`)
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['laser-step-files', variables.jobId] })
      toast.success('STEP bestand verwijderd')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Fout bij verwijderen STEP bestand')
    },
  })
}
