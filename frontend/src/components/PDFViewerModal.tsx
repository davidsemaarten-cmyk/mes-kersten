/**
 * PDFViewerModal — displays a single PDF drawing page in an iframe.
 *
 * Fetches the binary PDF from the backend (authenticated), creates a
 * temporary object URL, and renders it in an <iframe>.  No additional
 * npm packages are required.
 */

import { useEffect, useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { Button } from './ui/button'
import { Loader2, Download, Printer } from 'lucide-react'
import api from '../lib/api'

interface PDFViewerModalProps {
  open: boolean
  onClose: () => void
  jobId: string
  pdfId: string
  filename: string
  posnr?: string
}

export function PDFViewerModal({ open, onClose, jobId, pdfId, filename, posnr }: PDFViewerModalProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Fetch the PDF binary when the modal opens
  useEffect(() => {
    if (!open) return

    let url: string | null = null
    setLoading(true)
    setError(null)

    api.get(`/api/laserplanner/jobs/${jobId}/pdf/${pdfId}/download`, {
      responseType: 'arraybuffer',
    })
      .then((response) => {
        const blob = new Blob([response.data], { type: 'application/pdf' })
        url = URL.createObjectURL(blob)
        setObjectUrl(url)
      })
      .catch(() => {
        setError('PDF kon niet worden geladen.')
      })
      .finally(() => {
        setLoading(false)
      })

    return () => {
      // Revoke on cleanup (modal close / re-open with different pdf)
      if (url) URL.revokeObjectURL(url)
    }
  }, [open, jobId, pdfId])

  // Also revoke when objectUrl changes (prevents leaks)
  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [objectUrl])

  function handleClose() {
    setObjectUrl(null)
    setError(null)
    onClose()
  }

  function handlePrint() {
    iframeRef.current?.contentWindow?.print()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-5xl w-full max-h-[95vh] flex flex-col p-0 gap-0">

        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between px-4 py-3 border-b shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <DialogTitle className="text-base font-semibold truncate">
              {posnr ? (
                <span>
                  <span className="font-mono text-primary">{posnr.toUpperCase()}</span>
                  <span className="text-muted-foreground mx-2">—</span>
                  <span className="text-sm font-normal text-muted-foreground truncate">{filename}</span>
                </span>
              ) : (
                filename
              )}
            </DialogTitle>
            <DialogDescription className="sr-only">PDF tekening weergave</DialogDescription>
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-4">
            {objectUrl && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrint}
                  title="Afdrukken"
                >
                  <Printer className="h-4 w-4" />
                  <span className="ml-1.5 hidden sm:inline">Afdrukken</span>
                </Button>
                <a href={objectUrl} download={filename}>
                  <Button variant="ghost" size="sm" title="Downloaden">
                    <Download className="h-4 w-4" />
                    <span className="ml-1.5 hidden sm:inline">Downloaden</span>
                  </Button>
                </a>
              </>
            )}
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 min-h-0 bg-muted/30">
          {loading && (
            <div className="flex items-center justify-center h-full py-24">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center h-full py-24 text-destructive text-sm">
              {error}
            </div>
          )}
          {objectUrl && !loading && !error && (
            <iframe
              ref={iframeRef}
              src={objectUrl}
              className="w-full h-full min-h-[75vh]"
              title={filename}
              style={{ border: 'none' }}
            />
          )}
        </div>

      </DialogContent>
    </Dialog>
  )
}
