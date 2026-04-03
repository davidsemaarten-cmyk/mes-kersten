/**
 * AlmacamExportFlow — Status management + Almacam CSV export for a laser job.
 *
 * Renders contextual action buttons depending on the current job status:
 *   concept             → "Gereed voor Almacam melden"
 *   gereed_voor_almacam → "Exporteren" (primary) + "Terug naar Concept" (ghost)
 *   geexporteerd        → export metadata + "Herexporteren" (with warning)
 *
 * Export flow:
 *   1. If line items without a linked DXF exist → show NoDXFWarningDialog
 *   2. If already exported (export_count > 0)    → show ReexportConfirmDialog
 *   3. After confirmations                       → trigger download
 */

import { useState } from 'react'
import { Button } from './ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog'
import { CheckCircle, Download, AlertTriangle, RotateCcw, Loader2 } from 'lucide-react'
import { useUpdateJobStatus, useExportAlmacamCSV } from '../hooks/useLaserplanner'
import { LaserDXFFile, LaserJobWithLineItems } from '../types/database'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AlmacamExportFlowProps {
  job: LaserJobWithLineItems
  dxfFiles: LaserDXFFile[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return '(onbekend)'
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AlmacamExportFlow({ job, dxfFiles }: AlmacamExportFlowProps) {
  const [showNoDXFDialog, setShowNoDXFDialog]       = useState(false)
  const [showReexportDialog, setShowReexportDialog] = useState(false)

  const updateStatus = useUpdateJobStatus()
  const exportCSV    = useExportAlmacamCSV(job.id)

  // Line items that have no DXF file linked via line_item_id
  const linkedItemIds = new Set(
    dxfFiles.filter(d => d.line_item_id).map(d => d.line_item_id!)
  )
  const itemsWithoutDXF = (job.line_items ?? []).filter(i => !linkedItemIds.has(i.id))

  // ---------------------------------------------------------------------------
  // Export flow
  // ---------------------------------------------------------------------------

  function handleExportClick() {
    if (itemsWithoutDXF.length > 0) {
      setShowNoDXFDialog(true)
      return
    }
    if (job.export_count > 0) {
      setShowReexportDialog(true)
      return
    }
    doExport()
  }

  // Called after the "Toch exporteren" button in NoDXFDialog
  function handleNoDXFConfirm() {
    setShowNoDXFDialog(false)
    if (job.export_count > 0) {
      setShowReexportDialog(true)
    } else {
      doExport()
    }
  }

  function doExport() {
    exportCSV.mutate()
  }

  const isExporting = exportCSV.isPending
  const isUpdating  = updateStatus.isPending

  // ---------------------------------------------------------------------------
  // Status: concept
  // ---------------------------------------------------------------------------

  if (job.status === 'concept') {
    return (
      <Button
        onClick={() => updateStatus.mutate({ jobId: job.id, status: 'gereed_voor_almacam' })}
        disabled={isUpdating}
      >
        {isUpdating ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle className="mr-2 h-4 w-4" />
        )}
        Gereed voor Almacam melden
      </Button>
    )
  }

  // ---------------------------------------------------------------------------
  // Status: gereed_voor_almacam
  // ---------------------------------------------------------------------------

  if (job.status === 'gereed_voor_almacam') {
    return (
      <>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleExportClick} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Exporteren naar Almacam
          </Button>
          <Button
            variant="ghost"
            onClick={() => updateStatus.mutate({ jobId: job.id, status: 'concept' })}
            disabled={isUpdating}
          >
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <RotateCcw className="mr-2 h-4 w-4" />
            Terug naar Concept
          </Button>
        </div>

        <NoDXFWarningDialog
          open={showNoDXFDialog}
          items={itemsWithoutDXF}
          onCancel={() => setShowNoDXFDialog(false)}
          onConfirm={handleNoDXFConfirm}
        />
        <ReexportConfirmDialog
          open={showReexportDialog}
          exportDate={job.export_date}
          exportCount={job.export_count}
          onCancel={() => setShowReexportDialog(false)}
          onConfirm={() => { setShowReexportDialog(false); doExport() }}
        />
      </>
    )
  }

  // ---------------------------------------------------------------------------
  // Status: geexporteerd
  // ---------------------------------------------------------------------------

  if (job.status === 'geexporteerd') {
    return (
      <>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground space-y-0.5">
            <p>
              <span className="font-medium text-foreground">Geëxporteerd op</span>{' '}
              {formatTimestamp(job.export_date)}
              {job.exported_by_name && (
                <> door <span className="font-medium text-foreground">{job.exported_by_name}</span></>
              )}
            </p>
            {job.export_count > 1 && (
              <p className="text-xs text-amber-600">
                ({job.export_count}× geëxporteerd)
              </p>
            )}
          </div>
          <Button
            variant="outline"
            onClick={handleExportClick}
            disabled={isExporting}
            className="border-amber-400 text-amber-700 hover:bg-amber-50"
          >
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <AlertTriangle className="mr-2 h-4 w-4" />
            )}
            Herexporteren
          </Button>
        </div>

        <NoDXFWarningDialog
          open={showNoDXFDialog}
          items={itemsWithoutDXF}
          onCancel={() => setShowNoDXFDialog(false)}
          onConfirm={handleNoDXFConfirm}
        />
        <ReexportConfirmDialog
          open={showReexportDialog}
          exportDate={job.export_date}
          exportCount={job.export_count}
          onCancel={() => setShowReexportDialog(false)}
          onConfirm={() => { setShowReexportDialog(false); doExport() }}
        />
      </>
    )
  }

  return null
}

// ---------------------------------------------------------------------------
// Sub-dialogs
// ---------------------------------------------------------------------------

interface NoDXFWarningDialogProps {
  open: boolean
  items: { id: string; posnr: string | null }[]
  onCancel: () => void
  onConfirm: () => void
}

function NoDXFWarningDialog({ open, items, onCancel, onConfirm }: NoDXFWarningDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Onderdelen zonder DXF-koppeling
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                De volgende {items.length} onderdeel{items.length !== 1 ? 'en hebben' : ' heeft'} geen DXF-bestand gekoppeld.
                Deze onderdelen worden zonder DXF-bestand geëxporteerd: in de ZIP ontbreekt
                het DXF en in de CSV wordt het posnummer als <em>Name</em> gebruikt in
                plaats van de DXF-bestandsnaam.
              </p>
              <ul className="max-h-40 overflow-y-auto rounded border bg-muted px-3 py-2 text-sm font-mono">
                {items.map(i => (
                  <li key={i.id}>{i.posnr || '(geen posnr)'}</li>
                ))}
              </ul>
              <p>Wilt u toch doorgaan of eerst de DXF-bestanden koppelen?</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>DXFs eerst koppelen</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Toch exporteren</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

interface ReexportConfirmDialogProps {
  open: boolean
  exportDate: string | null
  exportCount: number
  onCancel: () => void
  onConfirm: () => void
}

function ReexportConfirmDialog({ open, exportDate, exportCount, onCancel, onConfirm }: ReexportConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Job al eerder geëxporteerd
          </AlertDialogTitle>
          <AlertDialogDescription>
            Deze job is al {exportCount}× geëxporteerd. Laatste export:{' '}
            <strong>{formatTimestamp(exportDate)}</strong>.
            <br /><br />
            Als u opnieuw exporteert, wordt in Almacam hetzelfde PLM_ExternalID gebruikt.
            Zorg ervoor dat u het nieuwe bestand importeert in plaats van het vorige.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Annuleren</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Opnieuw exporteren</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
