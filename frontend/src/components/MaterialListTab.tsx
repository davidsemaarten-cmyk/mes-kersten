/**
 * MaterialListTab — Materiaallijst tabblad voor de fase-pagina
 *
 * Toont alle laserjobs voor een fase met:
 * - CSV imports en versieselector
 * - Line items tabel met DXF/PDF/NC/STEP bestanden
 * - Upload mogelijkheden
 * - Handmatig posnummers toevoegen
 */

import { useState, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from './ui/table'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from './ui/select'
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, DialogFooter,
} from './ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from './ui/alert-dialog'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import {
  Upload, FileImage, FileText, Loader2,
  Pencil, Trash2, FileX, Plus, Cpu, Box,
} from 'lucide-react'
import { cn } from '../lib/utils'
import {
  useLaserJobsByFase,
  useLaserJob,
  useLaserCSVImports,
  useLaserDXFFiles,
  useLaserPDFFiles,
  useLaserNCFiles,
  useLaserStepFiles,
  useUpdateLineItem,
  useDeleteLineItem,
  useCreateManualLineItem,
  useDeleteDXFFile,
  useUploadLinkedDXF,
  useUploadNCFiles,
  useDeleteNCFile,
  useUploadStepFiles,
  useDeleteStepFile,
} from '../hooks/useLaserplanner'
import { usePermissions } from '../hooks/usePermissions'
import { UploadCSVModal } from './UploadCSVModal'
import { DXFUploadZone } from './DXFUploadZone'
import { DXFViewerModal } from './DXFViewerModal'
import { PDFUploadDialog } from './PDFUploadDialog'
import { PDFViewerModal } from './PDFViewerModal'
import { CreateJobModal } from './CreateJobModal'
import type {
  LaserLineItem, LaserDXFFile, LaserPDFFile,
  LaserNCFile, LaserStepFile,
} from '../types/database'

// ============================================================
// Helpers (same as LaserplannerDetail)
// ============================================================

function extractDikte(profiel: string | null | undefined): number | null {
  if (!profiel) return null
  const m = profiel.match(/^PL(\d+)/i)
  return m ? parseInt(m[1], 10) : null
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function sortItems(a: LaserLineItem, b: LaserLineItem): number {
  const da = extractDikte(a.profiel)
  const db = extractDikte(b.profiel)
  if (da === null && db !== null) return 1
  if (da !== null && db === null) return -1
  if (da !== db) return (da ?? 0) - (db ?? 0)
  const qa = (a.kwaliteit ?? '').toLowerCase()
  const qb = (b.kwaliteit ?? '').toLowerCase()
  if (qa !== qb) return qa < qb ? -1 : 1
  return (b.aantal ?? 0) - (a.aantal ?? 0)
}

// ============================================================
// Thumbnail cell
// ============================================================

interface ThumbnailCellProps {
  dxf: LaserDXFFile | undefined
  onClickView: (dxf: LaserDXFFile) => void
}

function ThumbnailCell({ dxf, onClickView }: ThumbnailCellProps) {
  if (!dxf?.thumbnail_svg) {
    return <span className="text-xs text-muted-foreground/50">—</span>
  }
  return (
    <button
      type="button"
      title={`Open ${dxf.original_filename}`}
      onClick={() => onClickView(dxf)}
      className="block rounded border border-border/50 bg-white hover:border-primary hover:shadow-sm transition-all overflow-hidden"
      style={{ lineHeight: 0 }}
      dangerouslySetInnerHTML={{ __html: dxf.thumbnail_svg }}
    />
  )
}

// ============================================================
// Line item edit / add dialog
// ============================================================

interface LineItemDialogProps {
  open: boolean
  onClose: () => void
  item: LaserLineItem | null
  jobId: string
}

function LineItemDialog({ open, onClose, item, jobId }: LineItemDialogProps) {
  const isNew = item === null
  const updateItem = useUpdateLineItem()
  const createItem = useCreateManualLineItem()

  const [posnr, setPosnr] = useState(item?.posnr ?? '')
  const [profiel, setProfiel] = useState(item?.profiel ?? '')
  const [kwaliteit, setKwaliteit] = useState(item?.kwaliteit ?? '')
  const [aantal, setAantal] = useState<string>(item?.aantal != null ? String(item.aantal) : '')
  const [opmerkingen, setOpmerkingen] = useState(item?.opmerkingen ?? '')

  function handleSave() {
    const aantalNum = aantal.trim() !== '' ? parseInt(aantal, 10) : null
    if (isNew) {
      createItem.mutate(
        {
          jobId,
          data: {
            posnr: posnr.trim() || null,
            profiel: profiel.trim() || null,
            kwaliteit: kwaliteit.trim() || null,
            aantal: aantalNum,
            opmerkingen: opmerkingen.trim() || null,
          },
        },
        { onSuccess: onClose }
      )
    } else {
      updateItem.mutate(
        {
          jobId,
          itemId: item!.id,
          data: {
            profiel: profiel.trim() || null,
            kwaliteit: kwaliteit.trim() || null,
            aantal: aantalNum,
            opmerkingen: opmerkingen.trim() || null,
          },
        },
        { onSuccess: onClose }
      )
    }
  }

  const isPending = updateItem.isPending || createItem.isPending

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Rij toevoegen' : 'Rij bewerken'}</DialogTitle>
          <DialogDescription className="sr-only">
            {isNew ? 'Voeg een nieuw posnummer toe aan de materiaallijst' : 'Bewerk een posnummer in de materiaallijst'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="li-posnr">Posnr</Label>
            {isNew ? (
              <Input
                id="li-posnr"
                value={posnr}
                onChange={(e) => setPosnr(e.target.value)}
                placeholder="bijv. 1A-001"
              />
            ) : (
              <Input id="li-posnr" value={item?.posnr ?? '—'} disabled className="font-mono" />
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="li-profiel">Profiel</Label>
            <Input
              id="li-profiel"
              value={profiel}
              onChange={(e) => setProfiel(e.target.value)}
              placeholder="bijv. PL10*50"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="li-kwaliteit">Kwaliteit</Label>
            <Input
              id="li-kwaliteit"
              value={kwaliteit}
              onChange={(e) => setKwaliteit(e.target.value)}
              placeholder="bijv. S235"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="li-aantal">Aantal</Label>
            <Input
              id="li-aantal"
              type="number"
              min={0}
              value={aantal}
              onChange={(e) => setAantal(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="li-opmerkingen">Opmerkingen</Label>
            <Textarea
              id="li-opmerkingen"
              value={opmerkingen}
              onChange={(e) => setOpmerkingen(e.target.value)}
              rows={2}
              placeholder="optioneel"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Annuleren
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Opslaan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Single job section (CSV + line items + files for one job)
// ============================================================

interface JobSectionProps {
  jobId: string
  showJobHeader: boolean
}

function JobSection({ jobId, showJobHeader }: JobSectionProps) {
  const navigate = useNavigate()
  const { canManageProjects } = usePermissions()

  const { data: job, isLoading: jobLoading } = useLaserJob(jobId)
  const { data: imports = [] } = useLaserCSVImports(jobId)
  const { data: dxfFiles = [] } = useLaserDXFFiles(jobId)
  const { data: pdfFiles = [] } = useLaserPDFFiles(jobId)
  const { data: ncFiles = [] } = useLaserNCFiles(jobId)
  const { data: stepFiles = [] } = useLaserStepFiles(jobId)
  const deleteDXF = useDeleteDXFFile()
  const deleteItem = useDeleteLineItem()
  const uploadLinked = useUploadLinkedDXF()
  const uploadNC = useUploadNCFiles()
  const uploadStep = useUploadStepFiles()

  const [uploadCSVOpen, setUploadCSVOpen] = useState(false)
  const [uploadDXFOpen, setUploadDXFOpen] = useState(false)
  const [uploadPDFOpen, setUploadPDFOpen] = useState(false)
  const [uploadNCOpen, setUploadNCOpen] = useState(false)
  const [uploadStepOpen, setUploadStepOpen] = useState(false)
  const ncFileInputRef = useRef<HTMLInputElement>(null)
  const stepFileInputRef = useRef<HTMLInputElement>(null)

  const [selectedImportId, setSelectedImportId] = useState<string | null>(null)
  const activeImportId = selectedImportId ?? imports[0]?.id ?? null

  const [viewingDXF, setViewingDXF] = useState<LaserDXFFile | null>(null)
  const [viewingPDF, setViewingPDF] = useState<LaserPDFFile | null>(null)
  const [editItem, setEditItem] = useState<LaserLineItem | null | 'new'>(null)
  const editDialogOpen = editItem !== null
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<LaserLineItem | null>(null)
  const [confirmDeleteDXF, setConfirmDeleteDXF] = useState<{ dxfId: string } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadTargetItem = useRef<LaserLineItem | null>(null)

  // Line items for active import
  const importItems = useMemo(() => {
    if (!job?.line_items) return []
    if (!activeImportId) return job.line_items
    return job.line_items.filter((i) => i.csv_import_id === activeImportId)
  }, [job?.line_items, activeImportId])

  // File maps
  const dxfByLineItem = useMemo(() => {
    const map: Record<string, LaserDXFFile> = {}
    for (const dxf of dxfFiles) {
      if (dxf.line_item_id && !map[dxf.line_item_id]) {
        map[dxf.line_item_id] = dxf
      }
    }
    return map
  }, [dxfFiles])

  const pdfByPosnr = useMemo(() => {
    const map: Record<string, LaserPDFFile> = {}
    for (const pdf of pdfFiles) {
      if (pdf.posnr_key) {
        map[pdf.posnr_key.toLowerCase()] = pdf
      }
    }
    return map
  }, [pdfFiles])

  const ncByLineItem = useMemo(() => {
    const map: Record<string, LaserNCFile> = {}
    for (const nc of ncFiles) {
      if (nc.line_item_id && !map[nc.line_item_id]) {
        map[nc.line_item_id] = nc
      }
    }
    return map
  }, [ncFiles])

  const stepByLineItem = useMemo(() => {
    const map: Record<string, LaserStepFile> = {}
    for (const step of stepFiles) {
      if (step.line_item_id && !map[step.line_item_id]) {
        map[step.line_item_id] = step
      }
    }
    return map
  }, [stepFiles])

  // Sorted items
  const sortedItems = useMemo(() => [...importItems].sort(sortItems), [importItems])
  const plItems = sortedItems.filter((i) => extractDikte(i.profiel) !== null)
  const otherItems = sortedItems.filter((i) => extractDikte(i.profiel) === null)

  const handleDXFUploadClick = useCallback((item: LaserLineItem) => {
    uploadTargetItem.current = item
    fileInputRef.current?.click()
  }, [])

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !uploadTargetItem.current) return
    uploadLinked.mutate({ jobId, itemId: uploadTargetItem.current.id, file })
    e.target.value = ''
  }

  // Status badge
  const statusConfig: Record<string, { label: string; className: string }> = {
    concept: { label: 'Concept', className: 'bg-muted border-border text-muted-foreground' },
    gereed_voor_almacam: { label: 'Gereed voor Almacam', className: 'bg-blue-50 border-blue-200 text-blue-700' },
    geexporteerd: { label: 'Geexporteerd', className: 'bg-green-50 border-green-200 text-green-700' },
  }

  const renderRow = useCallback((item: LaserLineItem, dimmed = false) => {
    const dxf = dxfByLineItem[item.id]
    const linkedPdf = pdfByPosnr[(item.posnr ?? '').toLowerCase().trim()]
    const nc = ncByLineItem[item.id]
    const step = stepByLineItem[item.id]
    return (
      <TableRow key={item.id} className={cn('group', dimmed && 'opacity-60')}>
        <TableCell className="py-1 w-16">
          <ThumbnailCell dxf={dxf} onClickView={setViewingDXF} />
        </TableCell>
        <TableCell className="w-40">
          {dxf ? (
            <span className="text-xs font-mono truncate block max-w-[10rem]" title={dxf.original_filename}>
              {dxf.original_filename}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground/50">—</span>
          )}
        </TableCell>
        <TableCell className="py-1 w-12">
          {linkedPdf?.thumbnail_png ? (
            <button
              type="button"
              title={`Tekening ${linkedPdf.posnr_key.toUpperCase()} openen`}
              onClick={() => setViewingPDF(linkedPdf)}
              className="block rounded border border-border/50 bg-white hover:border-primary hover:shadow-sm transition-all overflow-hidden"
              style={{ lineHeight: 0 }}
            >
              <img
                src={`data:image/png;base64,${linkedPdf.thumbnail_png}`}
                alt={linkedPdf.posnr_key}
                className="w-10 h-10 object-contain"
              />
            </button>
          ) : (
            <span className="text-xs text-muted-foreground/50">—</span>
          )}
        </TableCell>
        <TableCell className="py-1 w-12">
          {nc ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 min-w-[44px] min-h-[44px]"
              aria-label="NC bestand bekijken"
              title="NC bestand bekijken"
              onClick={() => navigate(`/orders/plaatlaser/nc-viewer/${jobId}/${nc.id}?posnr=${encodeURIComponent(nc.posnr_key)}&file=${encodeURIComponent(nc.original_filename)}`)}
            >
              <Cpu className="h-4 w-4 text-blue-600" />
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground/50">—</span>
          )}
        </TableCell>
        <TableCell className="py-1 w-12">
          {step ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 min-w-[44px] min-h-[44px]"
              aria-label="STEP bestand bekijken"
              title="STEP bestand bekijken"
              onClick={() => navigate(`/orders/plaatlaser/step-viewer/${jobId}/${step.id}?posnr=${encodeURIComponent(step.posnr_key)}&file=${encodeURIComponent(step.original_filename)}`)}
            >
              <Box className="h-4 w-4 text-purple-600" />
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground/50">—</span>
          )}
        </TableCell>
        <TableCell className="font-mono text-xs w-28">{item.posnr ?? '—'}</TableCell>
        <TableCell className="text-xs w-32">{item.profiel ?? '—'}</TableCell>
        <TableCell className="w-24">{extractDikte(item.profiel) ?? '—'}</TableCell>
        <TableCell>{item.kwaliteit ?? '—'}</TableCell>
        <TableCell className="text-right w-16">{item.aantal ?? '—'}</TableCell>
        {canManageProjects && (
          <TableCell className="w-36 py-1">
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" className="h-8 w-8 min-w-[44px] min-h-[44px]" aria-label="Bewerken" title="Bewerken" onClick={() => setEditItem(item)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 min-w-[44px] min-h-[44px]" aria-label="DXF uploaden" title="DXF uploaden" disabled={uploadLinked.isPending} onClick={() => handleDXFUploadClick(item)}>
                <Upload className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 min-w-[44px] min-h-[44px]" aria-label={dxf ? 'DXF verwijderen' : 'Geen DXF'} title={dxf ? 'DXF verwijderen' : 'Geen DXF'} disabled={!dxf} onClick={() => dxf && setConfirmDeleteDXF({ dxfId: dxf.id })}>
                <FileX className={cn('h-4 w-4', dxf && 'text-destructive')} />
              </Button>
              <span className="mx-1 h-4 border-l border-border" />
              <Button variant="ghost" size="icon" className="h-8 w-8 min-w-[44px] min-h-[44px] text-destructive hover:text-destructive" aria-label="Verwijderen" title="Verwijderen" onClick={() => setConfirmDeleteItem(item)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </TableCell>
        )}
      </TableRow>
    )
  }, [dxfByLineItem, pdfByPosnr, ncByLineItem, stepByLineItem, handleDXFUploadClick, uploadLinked.isPending, navigate, jobId, canManageProjects])

  if (jobLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (!job) return null

  const statusInfo = statusConfig[job.status] ?? statusConfig.concept

  return (
    <div className="space-y-4">
      {/* Job header (only shown when multiple jobs) */}
      {showJobHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">{job.naam}</h3>
            <Badge variant="outline" className={statusInfo.className}>
              {statusInfo.label}
            </Badge>
          </div>
        </div>
      )}

      {/* Upload buttons */}
      {canManageProjects && (
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setUploadCSVOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            CSV
          </Button>
          {imports.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={() => setUploadDXFOpen(true)}>
                <FileImage className="h-4 w-4 mr-2" />
                DXF
              </Button>
              <Button variant="outline" size="sm" onClick={() => setUploadPDFOpen(true)}>
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => setUploadNCOpen(true)}>
                <Cpu className="h-4 w-4 mr-2" />
                NC
              </Button>
              <Button variant="outline" size="sm" onClick={() => setUploadStepOpen(true)}>
                <Box className="h-4 w-4 mr-2" />
                STEP
              </Button>
            </>
          )}
        </div>
      )}

      {/* Empty state: no CSV imports yet */}
      {imports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg font-medium mb-2">Nog geen materiaallijst</p>
            <p className="text-sm text-muted-foreground mb-4">Upload een CSV bestand om te beginnen</p>
            {canManageProjects && (
              <Button onClick={() => setUploadCSVOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload CSV
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* CSV version selector */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
              CSV versie:
            </span>
            <Select
              value={activeImportId ?? ''}
              onValueChange={(v) => setSelectedImportId(v)}
            >
              <SelectTrigger className="w-[460px]">
                <SelectValue placeholder="Selecteer versie" />
              </SelectTrigger>
              <SelectContent>
                {imports.map((imp, idx) => (
                  <SelectItem key={imp.id} value={imp.id}>
                    Versie {imports.length - idx} — {imp.original_filename} ({formatTimestamp(imp.uploaded_at)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Line items table */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              {importItems.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Geen regels in deze versie
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">DXF</TableHead>
                        <TableHead className="w-40">DXF-bestand</TableHead>
                        <TableHead className="w-12">Tekening</TableHead>
                        <TableHead className="w-12">NC</TableHead>
                        <TableHead className="w-12">STEP</TableHead>
                        <TableHead className="w-28">Posnr</TableHead>
                        <TableHead className="w-32">Profiel</TableHead>
                        <TableHead className="w-24">Plaatdikte</TableHead>
                        <TableHead>Kwaliteit</TableHead>
                        <TableHead className="w-16 text-right">Aantal</TableHead>
                        {canManageProjects && <TableHead className="w-36">Acties</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plItems.map((item) => renderRow(item))}
                      {otherItems.length > 0 && (
                        <>
                          <TableRow>
                            <TableCell
                              colSpan={canManageProjects ? 11 : 10}
                              className="py-2 text-xs text-muted-foreground font-medium bg-muted/40 border-t"
                            >
                              Overige profielen (geen laserplaat)
                            </TableCell>
                          </TableRow>
                          {otherItems.map((item) => renderRow(item, true))}
                        </>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Add row button */}
              {canManageProjects && (
                <div className="pt-2 border-t">
                  <Button variant="outline" size="sm" onClick={() => setEditItem('new')}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Rij toevoegen
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ---- Modals ---- */}
      <UploadCSVModal
        open={uploadCSVOpen}
        onClose={() => setUploadCSVOpen(false)}
        jobId={jobId}
      />

      <Dialog open={uploadDXFOpen} onOpenChange={(o) => !o && setUploadDXFOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>DXF Bestanden Uploaden</DialogTitle>
            <DialogDescription className="sr-only">Upload DXF bestanden voor deze materiaallijst</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            Bestanden worden automatisch gekoppeld op basis van bestandsnaam = Posnr.
          </p>
          <DXFUploadZone
            jobId={jobId}
            importId={activeImportId ?? undefined}
            onDone={() => setUploadDXFOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {viewingDXF && (
        <DXFViewerModal
          open={!!viewingDXF}
          onClose={() => setViewingDXF(null)}
          jobId={jobId}
          dxfId={viewingDXF.id}
          filename={viewingDXF.original_filename}
        />
      )}

      <PDFUploadDialog
        open={uploadPDFOpen}
        onClose={() => setUploadPDFOpen(false)}
        jobId={jobId}
        jobLineItems={job?.line_items ?? []}
      />

      {viewingPDF && (
        <PDFViewerModal
          open={!!viewingPDF}
          onClose={() => setViewingPDF(null)}
          jobId={jobId}
          pdfId={viewingPDF.id}
          filename={viewingPDF.original_pdf_filename}
          posnr={viewingPDF.posnr_key}
        />
      )}

      <Dialog open={uploadNCOpen} onOpenChange={(o) => !o && setUploadNCOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>NC Bestanden Uploaden</DialogTitle>
            <DialogDescription className="sr-only">Upload NC bestanden voor deze materiaallijst</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            Upload .nc1 bestanden. Worden automatisch gekoppeld op bestandsnaam = Posnr.
          </p>
          <div className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => ncFileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Klik om .nc1 bestanden te selecteren</p>
            </div>
            <input
              ref={ncFileInputRef}
              type="file"
              accept=".nc1,.nc"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? [])
                if (files.length === 0) return
                uploadNC.mutate(
                  { jobId, files },
                  { onSuccess: () => setUploadNCOpen(false) }
                )
                e.target.value = ''
              }}
            />
            {uploadNC.isPending && (
              <div className="flex items-center justify-center gap-2 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Uploaden...</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadStepOpen} onOpenChange={(o) => !o && setUploadStepOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>STEP Bestanden Uploaden</DialogTitle>
            <DialogDescription className="sr-only">Upload STEP bestanden voor deze materiaallijst</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            Upload .step of .stp bestanden. Worden automatisch gekoppeld op bestandsnaam = Posnr.
          </p>
          <div className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => stepFileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Klik om .step of .stp bestanden te selecteren</p>
            </div>
            <input
              ref={stepFileInputRef}
              type="file"
              accept=".step,.stp"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? [])
                if (files.length === 0) return
                uploadStep.mutate(
                  { jobId, files },
                  { onSuccess: () => setUploadStepOpen(false) }
                )
                e.target.value = ''
              }}
            />
            {uploadStep.isPending && (
              <div className="flex items-center justify-center gap-2 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Uploaden...</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <LineItemDialog
        key={editItem === 'new' ? 'new' : (editItem as LaserLineItem | null)?.id ?? 'closed'}
        open={editDialogOpen}
        onClose={() => setEditItem(null)}
        item={editItem === 'new' ? null : (editItem as LaserLineItem | null)}
        jobId={jobId}
      />

      <AlertDialog
        open={!!confirmDeleteItem}
        onOpenChange={(o) => !o && setConfirmDeleteItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regel verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Regel <span className="font-mono font-semibold">{confirmDeleteItem?.posnr ?? '—'}</span> en het gekoppelde DXF-bestand worden permanent verwijderd.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!confirmDeleteItem) return
                deleteItem.mutate(
                  { jobId, itemId: confirmDeleteItem.id },
                  { onSettled: () => setConfirmDeleteItem(null) }
                )
              }}
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!confirmDeleteDXF}
        onOpenChange={(o) => !o && setConfirmDeleteDXF(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>DXF verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Het DXF-bestand wordt permanent verwijderd. De regel zelf blijft bestaan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!confirmDeleteDXF) return
                deleteDXF.mutate(
                  { jobId, dxfId: confirmDeleteDXF.dxfId },
                  { onSettled: () => setConfirmDeleteDXF(null) }
                )
              }}
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <input
        ref={fileInputRef}
        type="file"
        accept=".dxf"
        className="hidden"
        onChange={handleFileInputChange}
      />
    </div>
  )
}

// ============================================================
// Main MaterialListTab component
// ============================================================

interface MaterialListTabProps {
  faseId: string
  projectId: string
}

export function MaterialListTab({ faseId, projectId }: MaterialListTabProps) {
  const { data: jobs, isLoading } = useLaserJobsByFase(faseId)
  const { canManageProjects } = usePermissions()
  const [createJobOpen, setCreateJobOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (!jobs || jobs.length === 0) {
    return (
      <>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Upload className="h-12 w-12 text-muted-foreground mb-4 opacity-40" />
            <p className="text-lg font-medium mb-2">Nog geen materiaallijst</p>
            <p className="text-sm text-muted-foreground mb-4">
              Maak een laserjob aan om een materiaallijst te importeren
            </p>
            {canManageProjects && (
              <Button onClick={() => setCreateJobOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nieuwe Laserjob
              </Button>
            )}
          </CardContent>
        </Card>

        <CreateJobModal
          open={createJobOpen}
          onClose={() => setCreateJobOpen(false)}
          defaultProjectId={projectId}
          defaultFaseId={faseId}
        />
      </>
    )
  }

  const showJobHeaders = jobs.length > 1

  return (
    <div className="space-y-6">
      {/* Add job button when there are already jobs */}
      {canManageProjects && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => setCreateJobOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nieuwe Laserjob
          </Button>
        </div>
      )}

      {jobs.map((job) => (
        <JobSection
          key={job.id}
          jobId={job.id}
          showJobHeader={showJobHeaders}
        />
      ))}

      <CreateJobModal
        open={createJobOpen}
        onClose={() => setCreateJobOpen(false)}
        defaultProjectId={projectId}
        defaultFaseId={faseId}
      />
    </div>
  )
}
