import { useState, useMemo, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import {
  useLaserJob,
  useUpdateJobStatus,
  useLaserCSVImports,
  useLaserCSVImportDetail,
  useLaserDXFFiles,
  useUpdateLineItem,
  useDeleteLineItem,
  useCreateManualLineItem,
  useDeleteDXFFile,
  useUploadLinkedDXF,
} from '../hooks/useLaserplanner'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import {
  ArrowLeft, Loader2, Upload, FileImage,
  Pencil, Trash2, FileX, Plus,
} from 'lucide-react'
import { LaserJobStatus, LaserLineItem, LaserDXFFile } from '../types/database'
import { UploadCSVModal } from '../components/UploadCSVModal'
import { DXFUploadZone } from '../components/DXFUploadZone'
import { DXFViewerModal } from '../components/DXFViewerModal'
import { cn } from '../lib/utils'

// ============================================================
// Helpers
// ============================================================

/** Extract thickness from "PL10*50" → 10. Returns null if not a PL profiel. */
function extractDikte(profiel: string | null | undefined): number | null {
  if (!profiel) return null
  const m = profiel.match(/^PL(\d+)/i)
  return m ? parseInt(m[1], 10) : null
}

/** Format ISO timestamp as "DD-MM-YYYY HH:mm" */
function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** Sort order: PL items by dikte asc / kwaliteit asc / aantal desc; non-PL at bottom. */
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
// SVG Thumbnail cell
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
  item: LaserLineItem | null  // null = new item
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

  // State resets automatically because the parent passes a unique `key` prop
  // (item.id for edits, 'new' for new rows), so this component re-mounts on change.

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
// Main component
// ============================================================

export function LaserplannerDetail() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()

  const { data: job, isLoading: jobLoading } = useLaserJob(jobId)
  const { data: imports = [] } = useLaserCSVImports(jobId)
  const { data: dxfFiles = [] } = useLaserDXFFiles(jobId)
  const updateStatus = useUpdateJobStatus()
  const deleteDXF = useDeleteDXFFile()
  const deleteItem = useDeleteLineItem()
  const uploadLinked = useUploadLinkedDXF()

  const [uploadCSVOpen, setUploadCSVOpen] = useState(false)
  const [uploadDXFOpen, setUploadDXFOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'materiaallijst' | 'origineel'>('materiaallijst')

  // CSV version selector
  const [selectedImportId, setSelectedImportId] = useState<string | null>(null)
  const activeImportId = selectedImportId ?? imports[0]?.id ?? null

  // DXF viewer state
  const [viewingDXF, setViewingDXF] = useState<LaserDXFFile | null>(null)

  // Edit / add dialog
  const [editItem, setEditItem] = useState<LaserLineItem | null | 'new'>(null)
  const editDialogOpen = editItem !== null

  // Confirm: delete row
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<LaserLineItem | null>(null)
  // Confirm: delete DXF
  const [confirmDeleteDXF, setConfirmDeleteDXF] = useState<{ dxfId: string } | null>(null)

  // Hidden file input for per-row DXF upload
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadTargetItem = useRef<LaserLineItem | null>(null)

  // Fetch raw CSV only when the Originele CSV tab is active
  const { data: importDetail, isLoading: detailLoading } = useLaserCSVImportDetail(
    jobId,
    activeImportId ?? undefined,
    activeTab === 'origineel'
  )

  // Line items for the selected import
  const importItems = useMemo(() => {
    if (!job?.line_items) return []
    if (!activeImportId) return job.line_items
    return job.line_items.filter((i) => i.csv_import_id === activeImportId)
  }, [job?.line_items, activeImportId])

  // DXF map: line_item_id → first DXF file for that item
  const dxfByLineItem = useMemo(() => {
    const map: Record<string, LaserDXFFile> = {}
    for (const dxf of dxfFiles) {
      if (dxf.line_item_id && !map[dxf.line_item_id]) {
        map[dxf.line_item_id] = dxf
      }
    }
    return map
  }, [dxfFiles])

  // Sorted items
  const sortedItems = useMemo(() => [...importItems].sort(sortItems), [importItems])
  const plItems = sortedItems.filter((i) => extractDikte(i.profiel) !== null)
  const otherItems = sortedItems.filter((i) => extractDikte(i.profiel) === null)

  // Active import metadata
  const activeImport = imports.find((i) => i.id === activeImportId) ?? null
  const clientNaam = activeImport?.csv_metadata?.row3 ?? job?.csv_metadata?.row3 ?? '—'
  const datum = activeImport?.csv_metadata?.row1 ?? job?.csv_metadata?.row1 ?? '—'
  const projectcode = importItems[0]?.projectcode ?? '—'
  const fasenr = importItems[0]?.fasenr ?? '—'

  const handleStatusChange = (s: string) => {
    if (!jobId) return
    updateStatus.mutate({ jobId, status: s })
  }

  const handleDXFUploadClick = useCallback((item: LaserLineItem) => {
    uploadTargetItem.current = item
    fileInputRef.current?.click()
  }, [])

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !uploadTargetItem.current || !jobId) return
    uploadLinked.mutate({ jobId, itemId: uploadTargetItem.current.id, file })
    // Reset input so same file can be picked again
    e.target.value = ''
  }

  // Shared row renderer — memoised to avoid recreation on every render
  const renderRow = useCallback((item: LaserLineItem, dimmed = false) => {
    const dxf = dxfByLineItem[item.id]
    return (
      <TableRow key={item.id} className={cn(dimmed && 'opacity-60')}>
        {/* DXF thumbnail */}
        <TableCell className="py-1 w-16">
          <ThumbnailCell dxf={dxf} onClickView={setViewingDXF} />
        </TableCell>

        {/* DXF filename */}
        <TableCell className="w-40">
          {dxf ? (
            <span
              className="text-xs font-mono truncate block max-w-[10rem]"
              title={dxf.original_filename}
            >
              {dxf.original_filename}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground/50">—</span>
          )}
        </TableCell>

        {/* Posnr */}
        <TableCell className="font-mono text-xs w-28">{item.posnr ?? '—'}</TableCell>

        {/* Profiel (raw value) */}
        <TableCell className="text-xs w-32">{item.profiel ?? '—'}</TableCell>

        {/* Plaatdikte */}
        <TableCell className="w-24">{extractDikte(item.profiel) ?? '—'}</TableCell>

        {/* Kwaliteit */}
        <TableCell>{item.kwaliteit ?? '—'}</TableCell>

        {/* Aantal */}
        <TableCell className="text-right w-16">{item.aantal ?? '—'}</TableCell>

        {/* Acties */}
        <TableCell className="w-36 py-1">
          <div className="flex items-center gap-0.5">
            {/* Edit */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Bewerken"
              onClick={() => setEditItem(item)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>

            {/* Upload DXF for this row */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="DXF uploaden voor deze regel"
              disabled={uploadLinked.isPending}
              onClick={() => handleDXFUploadClick(item)}
            >
              <Upload className="h-3.5 w-3.5" />
            </Button>

            {/* Remove linked DXF */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title={dxf ? 'DXF verwijderen' : 'Geen DXF gekoppeld'}
              disabled={!dxf}
              onClick={() => dxf && setConfirmDeleteDXF({ dxfId: dxf.id })}
            >
              <FileX className={cn('h-3.5 w-3.5', dxf && 'text-destructive')} />
            </Button>

            {/* Separator */}
            <span className="mx-1 h-4 border-l border-border" />

            {/* Delete row */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              title="Regel verwijderen"
              onClick={() => setConfirmDeleteItem(item)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    )
  }, [dxfByLineItem, handleDXFUploadClick, uploadLinked.isPending])

  if (jobLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    )
  }

  if (!job) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-lg">Job niet gevonden</p>
          <Button onClick={() => navigate('/laserplanner')} className="mt-4">
            Terug naar overzicht
          </Button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">

        {/* ── Page header ── */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/laserplanner')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{job.naam}</h1>
              {job.beschrijving && (
                <p className="text-muted-foreground">{job.beschrijving}</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            <Button variant="outline" onClick={() => setUploadCSVOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload CSV
            </Button>
            {imports.length > 0 && (
              <Button onClick={() => setUploadDXFOpen(true)}>
                <FileImage className="h-4 w-4 mr-2" />
                Upload DXF
              </Button>
            )}
          </div>
        </div>

        {/* ── Status card ── */}
        <Card>
          <CardHeader><CardTitle>Status</CardTitle></CardHeader>
          <CardContent>
            <Select value={job.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aangemaakt">Aangemaakt</SelectItem>
                <SelectItem value="geprogrammeerd">Geprogrammeerd</SelectItem>
                <SelectItem value="nc_verzonden">NC verzonden</SelectItem>
                <SelectItem value="gereed">Gereed</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* ── Empty state ── */}
        {imports.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-lg font-medium mb-2">Nog geen materiaallijst</p>
              <p className="text-sm text-muted-foreground mb-4">Upload een CSV bestand om te beginnen</p>
              <Button onClick={() => setUploadCSVOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload CSV
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* ── CSV version selector ── */}
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

            {/* ── Tabs ── */}
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as typeof activeTab)}
            >
              <TabsList>
                <TabsTrigger value="materiaallijst">Materiaallijst</TabsTrigger>
                <TabsTrigger value="origineel">Originele CSV</TabsTrigger>
              </TabsList>

              {/* ── Tab 1: Materiaallijst ── */}
              <TabsContent value="materiaallijst" className="mt-4">
                <Card>
                  <CardContent className="pt-6 space-y-4">

                    {/* Header block */}
                    <div className="flex flex-wrap gap-x-8 gap-y-1 text-sm border-b pb-4">
                      <div>
                        <span className="text-muted-foreground">Klant: </span>
                        <span className="font-semibold">{clientNaam}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Projectcode: </span>
                        <span className="font-semibold">{projectcode}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Fasenr: </span>
                        <span className="font-semibold">{fasenr}</span>
                      </div>
                      <div className="text-muted-foreground italic">{datum}</div>
                    </div>

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
                              <TableHead className="w-28">Posnr</TableHead>
                              <TableHead className="w-32">Profiel</TableHead>
                              <TableHead className="w-24">Plaatdikte</TableHead>
                              <TableHead>Kwaliteit</TableHead>
                              <TableHead className="w-16 text-right">Aantal</TableHead>
                              <TableHead className="w-36">Acties</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {/* PL plate rows */}
                            {plItems.map((item) => renderRow(item))}

                            {/* Separator + non-PL rows */}
                            {otherItems.length > 0 && (
                              <>
                                <TableRow>
                                  <TableCell
                                    colSpan={8}
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
                    <div className="pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditItem('new')}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        Rij toevoegen
                      </Button>
                    </div>

                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Tab 2: Originele CSV ── */}
              <TabsContent value="origineel" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    {detailLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : importDetail?.raw_content ? (
                      <pre className="text-xs font-mono whitespace-pre overflow-x-auto leading-relaxed bg-muted/30 rounded-md p-4 max-h-[60vh]">
                        {importDetail.raw_content}
                      </pre>
                    ) : (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        Geen origineel bestand beschikbaar voor deze versie
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      {/* ── Modals ── */}
      <UploadCSVModal
        open={uploadCSVOpen}
        onClose={() => setUploadCSVOpen(false)}
        jobId={job.id}
      />

      {/* DXF bulk upload dialog */}
      <Dialog open={uploadDXFOpen} onOpenChange={(o) => !o && setUploadDXFOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>DXF Bestanden Uploaden</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            Bestanden worden automatisch gekoppeld op basis van bestandsnaam (zonder extensie) = Posnr.
          </p>
          <DXFUploadZone
            jobId={job.id}
            importId={activeImportId ?? undefined}
            onDone={() => setUploadDXFOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* DXF viewer modal */}
      {viewingDXF && (
        <DXFViewerModal
          open={!!viewingDXF}
          onClose={() => setViewingDXF(null)}
          jobId={job.id}
          dxfId={viewingDXF.id}
          filename={viewingDXF.original_filename}
        />
      )}

      {/* Line item edit / add dialog */}
      <LineItemDialog
        key={editItem === 'new' ? 'new' : (editItem as LaserLineItem | null)?.id ?? 'closed'}
        open={editDialogOpen}
        onClose={() => setEditItem(null)}
        item={editItem === 'new' ? null : (editItem as LaserLineItem | null)}
        jobId={job.id}
      />

      {/* Confirm: delete row */}
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
                if (!confirmDeleteItem || !jobId) return
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

      {/* Confirm: delete DXF */}
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
                if (!confirmDeleteDXF || !jobId) return
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

      {/* Hidden file input for per-row DXF upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".dxf"
        className="hidden"
        onChange={handleFileInputChange}
      />
    </Layout>
  )
}
