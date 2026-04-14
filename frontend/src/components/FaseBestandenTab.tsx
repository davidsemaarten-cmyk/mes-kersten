/**
 * FaseBestandenTab — Bestandsbeheer op fase-niveau
 *
 * Features:
 * - Drag-and-drop upload zone
 * - File list with download/delete
 * - File type and size display
 */

import { useCallback, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from './ui/table'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from './ui/alert-dialog'
import {
  FileText, Upload, Trash2, Download, Loader2, File as FileIcon,
  FileImage, FileArchive, FileSpreadsheet,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { useFaseFiles, useUploadFaseFile, useDeleteFaseFile, getFaseFileDownloadUrl } from '../hooks/useFaseFiles'
import { usePermissions } from '../hooks/usePermissions'
import { api } from '../lib/api'

interface FaseBestandenTabProps {
  faseId: string
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(fileType: string | null, filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const type = fileType || ''

  if (type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
    return <FileImage className="h-5 w-5 text-blue-500" />
  }
  if (type === 'application/pdf' || ext === 'pdf') {
    return <FileText className="h-5 w-5 text-red-500" />
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return <FileArchive className="h-5 w-5 text-yellow-500" />
  }
  if (['xlsx', 'xls', 'csv'].includes(ext)) {
    return <FileSpreadsheet className="h-5 w-5 text-green-500" />
  }
  return <FileIcon className="h-5 w-5 text-muted-foreground" />
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function FaseBestandenTab({ faseId }: FaseBestandenTabProps) {
  const { canManageProjects } = usePermissions()
  const { data: files, isLoading } = useFaseFiles(faseId)
  const uploadMutation = useUploadFaseFile(faseId)
  const deleteMutation = useDeleteFaseFile(faseId)

  const [isDragOver, setIsDragOver] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; filename: string } | null>(null)

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return
      Array.from(fileList).forEach((file) => {
        uploadMutation.mutate(file)
      })
    },
    [uploadMutation]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragOver(false)
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles]
  )

  const handleDownload = async (fileId: string, filename: string) => {
    try {
      const response = await api.get(`/api/fase-files/${fileId}/download`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      // fallback: open in tab
      window.open(`/api/fase-files/${fileId}/download`, '_blank')
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      {canManageProjects && (
        <Card>
          <CardContent className="pt-6">
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
                isDragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50'
              )}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragOver(true)
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => {
                const input = document.createElement('input')
                input.type = 'file'
                input.multiple = true
                input.onchange = (e) => {
                  handleFiles((e.target as HTMLInputElement).files)
                }
                input.click()
              }}
            >
              {uploadMutation.isPending ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Uploaden...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    Sleep bestanden hierheen of klik om te uploaden
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Werkplaatstekenigen, revisie-PDF's, montage-instructies, etc.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* File List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Bestanden
            {files && files.length > 0 && (
              <Badge variant="secondary">{files.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !files || files.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nog geen bestanden geüpload</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bestand</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Grootte</TableHead>
                  <TableHead>Geüpload door</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead className="text-right">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getFileIcon(file.file_type, file.filename)}
                        <span className="font-medium text-sm">{file.filename}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {file.file_type || '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{formatFileSize(file.file_size)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{file.uploader_name || '—'}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(file.created_at)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Downloaden"
                          onClick={() => handleDownload(file.id, file.filename)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {canManageProjects && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Verwijderen"
                            onClick={() =>
                              setDeleteTarget({ id: file.id, filename: file.filename })
                            }
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete confirm dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bestand verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je "{deleteTarget?.filename}" wilt verwijderen? Dit kan niet
              ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  deleteMutation.mutate(deleteTarget.id)
                  setDeleteTarget(null)
                }
              }}
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
