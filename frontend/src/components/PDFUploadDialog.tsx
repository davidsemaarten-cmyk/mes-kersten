/**
 * PDFUploadDialog — two-step upload flow for Tekla POSNR drawing PDFs.
 *
 * Phase 1 (idle → parsing): file drop / select → POST /pdf/parse
 * Phase 2 (review):         show per-page thumbnail + editable Posnr + match badge
 * Phase 3 (saving):         POST /pdf/confirm
 */

import { useState, useRef, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { Loader2, Upload, FileCheck2 } from 'lucide-react'
import { useUploadPDF, useConfirmPDF } from '../hooks/useLaserplanner'
import { LaserLineItem, PDFPagePreview, PDFUploadPreviewResponse } from '../types/database'
import { cn } from '../lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConfirmPage {
  page_number: number
  posnr: string          // current (user-editable) value
  thumbnail_png: string  // from parse response, fixed
  match_status: 'matched' | 'unmatched' | 'will_overwrite'
}

type Phase = 'idle' | 'parsing' | 'review' | 'saving'

interface PDFUploadDialogProps {
  open: boolean
  onClose: () => void
  jobId: string
  jobLineItems: LaserLineItem[]
}

// ---------------------------------------------------------------------------
// Badge helpers
// ---------------------------------------------------------------------------

function matchStatusLabel(status: 'matched' | 'unmatched' | 'will_overwrite', hasPosnr: boolean) {
  if (!hasPosnr) return 'Overgeslagen'
  if (status === 'matched')        return 'Gevonden'
  if (status === 'will_overwrite') return 'Overschrijft bestaande tekening'
  return 'Niet gevonden in lijst'
}

function matchStatusVariant(status: 'matched' | 'unmatched' | 'will_overwrite', hasPosnr: boolean):
  'default' | 'secondary' | 'destructive' | 'outline' {
  if (!hasPosnr)                   return 'outline'
  if (status === 'matched')        return 'default'
  if (status === 'will_overwrite') return 'destructive'
  return 'secondary'
}

// ---------------------------------------------------------------------------
// Recompute match_status client-side when the user edits a posnr
// ---------------------------------------------------------------------------

function recomputeStatus(
  posnr: string,
  jobPosnrSet: Set<string>,
  existingPosnrKeys: Set<string>,
): 'matched' | 'unmatched' | 'will_overwrite' {
  const lower = posnr.trim().toLowerCase()
  if (!lower) return 'unmatched'
  if (jobPosnrSet.has(lower)) {
    return existingPosnrKeys.has(lower) ? 'will_overwrite' : 'matched'
  }
  return 'unmatched'
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PDFUploadDialog({ open, onClose, jobId, jobLineItems }: PDFUploadDialogProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [dragOver, setDragOver] = useState(false)
  const [preview, setPreview] = useState<PDFUploadPreviewResponse | null>(null)
  const [pages, setPages] = useState<ConfirmPage[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadPDF  = useUploadPDF(jobId)
  const confirmPDF = useConfirmPDF(jobId)

  // Set of lowercase posnrs from job line items (for client-side re-validation)
  const jobPosnrSet = useMemo(
    () => new Set(jobLineItems.map(i => (i.posnr ?? '').toLowerCase().trim()).filter(Boolean)),
    [jobLineItems]
  )

  // Set of posnr_keys that already have a drawing stored
  // (derived from will_overwrite status in the parse response)
  const existingPosnrKeys = useMemo(() => {
    if (!preview) return new Set<string>()
    return new Set(
      preview.pages
        .filter(p => p.match_status === 'will_overwrite')
        .map(p => p.extracted_posnr.toLowerCase().trim())
    )
  }, [preview])

  // Counts for the review header
  const willSave   = pages.filter(p => p.posnr.trim() !== '').length
  const willSkip   = pages.filter(p => p.posnr.trim() === '').length + (preview?.skipped_count ?? 0)
  const totalPages = preview?.total_pages ?? 0

  function reset() {
    setPhase('idle')
    setPreview(null)
    setPages([])
    setDragOver(false)
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function startParsing(file: File) {
    setPhase('parsing')
    uploadPDF.mutate(
      { file },
      {
        onSuccess: (data) => {
          setPreview(data)
          const confirmPages: ConfirmPage[] = data.pages.map((p: PDFPagePreview) => ({
            page_number:   p.page_number,
            // Unmatched pages start with an empty posnr so the user must
            // explicitly fill it in before it gets saved.  Matched pages
            // (and pages that would overwrite) keep the extracted value.
            posnr:         p.match_status === 'unmatched' ? '' : p.extracted_posnr,
            thumbnail_png: p.thumbnail_png,
            match_status:  p.match_status,
          }))
          setPages(confirmPages)
          setPhase('review')
        },
        onError: () => {
          setPhase('idle')
        },
      }
    )
  }

  function handleFileSelected(file: File | null) {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.pdf')) return
    startParsing(file)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    handleFileSelected(file ?? null)
  }

  function updatePosnr(index: number, newPosnr: string) {
    setPages(prev => prev.map((p, i) => {
      if (i !== index) return p
      const status = recomputeStatus(newPosnr, jobPosnrSet, existingPosnrKeys)
      return { ...p, posnr: newPosnr, match_status: status }
    }))
  }

  function handleConfirm() {
    if (!preview) return
    setPhase('saving')
    confirmPDF.mutate(
      {
        temp_id:          preview.temp_id,
        original_filename: preview.original_filename,
        confirmed_pages:  pages.map(p => ({
          page_number:   p.page_number,
          posnr:         p.posnr.trim(),
          thumbnail_png: p.thumbnail_png || undefined,
        })),
      },
      {
        onSuccess: () => {
          reset()
          onClose()
        },
        onError: () => {
          setPhase('review')
        },
      }
    )
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Tekening PDF uploaden</DialogTitle>
          <DialogDescription>Upload een PDF met Tekla POSNR tekeningen.</DialogDescription>
        </DialogHeader>

        {/* ── Phase: idle ── */}
        {phase === 'idle' && (
          <div
            className={cn(
              'flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-12 cursor-pointer transition-colors',
              dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            )}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-10 w-10 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">Klik of sleep een PDF hierheen</p>
              <p className="text-sm text-muted-foreground mt-1">
                Tekla "onderdelen POSNR" export (multi-pagina PDF)
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
            />
          </div>
        )}

        {/* ── Phase: parsing ── */}
        {phase === 'parsing' && (
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">PDF wordt verwerkt…</p>
          </div>
        )}

        {/* ── Phase: review ── */}
        {(phase === 'review' || phase === 'saving') && preview && (
          <>
            {/* Summary header */}
            <div className="flex items-center gap-3 px-1 py-2 rounded-md bg-muted/50 text-sm shrink-0">
              <FileCheck2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>
                <span className="font-semibold">{willSave}</span> van{' '}
                <span className="font-semibold">{totalPages}</span> pagina's worden opgeslagen
                {willSkip > 0 && (
                  <span className="text-muted-foreground ml-2">
                    ({willSkip} overgeslagen)
                  </span>
                )}
              </span>
            </div>

            {/* Scrollable page list */}
            <div className="flex-1 overflow-y-auto min-h-0 -mx-1 px-1 space-y-2 py-1">
              {pages.map((page, idx) => {
                const hasPosnr = page.posnr.trim() !== ''
                return (
                  <div
                    key={page.page_number}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border p-2',
                      !hasPosnr && 'opacity-50'
                    )}
                  >
                    {/* Thumbnail */}
                    <div className="shrink-0 w-16 h-16 rounded border overflow-hidden bg-white flex items-center justify-center">
                      <img
                        src={`data:image/png;base64,${page.thumbnail_png}`}
                        alt={`Pagina ${page.page_number}`}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>

                    {/* Page number */}
                    <span className="text-xs text-muted-foreground w-12 shrink-0">
                      p. {page.page_number}
                    </span>

                    {/* Editable Posnr */}
                    <Input
                      value={page.posnr}
                      onChange={(e) => updatePosnr(idx, e.target.value)}
                      placeholder="(leeglaten = overslaan)"
                      className="h-8 text-sm font-mono w-40 shrink-0"
                    />

                    {/* Match badge */}
                    <Badge
                      variant={matchStatusVariant(page.match_status, hasPosnr)}
                      className="text-xs whitespace-nowrap"
                    >
                      {matchStatusLabel(page.match_status, hasPosnr)}
                    </Badge>
                  </div>
                )
              })}
            </div>

            <DialogFooter className="shrink-0 pt-2">
              <Button variant="ghost" onClick={handleClose} disabled={phase === 'saving'}>
                Annuleren
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={phase === 'saving' || willSave === 0}
              >
                {phase === 'saving' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {willSave} tekening{willSave !== 1 ? 'en' : ''} opslaan
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Footer for idle phase */}
        {phase === 'idle' && (
          <DialogFooter>
            <Button variant="ghost" onClick={handleClose}>Sluiten</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
