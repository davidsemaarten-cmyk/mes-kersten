import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog'
import { Button } from './ui/button'
import { Checkbox } from './ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { useParseCSV, useAddLineItems } from '../hooks/useLaserplanner'
import { Loader2, Upload } from 'lucide-react'
import { cn } from '../lib/utils'

interface UploadCSVModalProps {
  open: boolean
  onClose: () => void
  jobId: string
}

export function UploadCSVModal({ open, onClose, jobId }: UploadCSVModalProps) {
  const parseCSV = useParseCSV()
  const addLineItems = useAddLineItems()
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<any>(null)
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelected = async (selectedFile: File | null) => {
    if (!selectedFile) return
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) return

    setFile(selectedFile)
    const result = await parseCSV.mutateAsync(selectedFile)
    setParsedData(result)

    // Select all rows by default
    const allRowNumbers = result.rows.map((r: any) => r.row_number)
    setSelectedRows(new Set(allRowNumbers))
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    handleFileSelected(droppedFile ?? null)
  }

  const toggleRow = (rowNumber: number) => {
    const newSelected = new Set(selectedRows)
    if (newSelected.has(rowNumber)) {
      newSelected.delete(rowNumber)
    } else {
      newSelected.add(rowNumber)
    }
    setSelectedRows(newSelected)
  }

  const toggleAll = () => {
    if (selectedRows.size === parsedData.rows.length) {
      setSelectedRows(new Set())
    } else {
      const allRowNumbers = parsedData.rows.map((r: any) => r.row_number)
      setSelectedRows(new Set(allRowNumbers))
    }
  }

  const handleClose = () => {
    setFile(null)
    setParsedData(null)
    setSelectedRows(new Set())
    onClose()
  }

  const handleImport = async () => {
    if (!parsedData || !file) return

    await addLineItems.mutateAsync({
      jobId,
      selectedRows: Array.from(selectedRows),
      csvMetadata: parsedData.metadata,
      allRows: parsedData.rows,
      rawContent: parsedData.raw_content,
      originalFilename: file.name,
    })

    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>CSV Uploaden</DialogTitle>
          <DialogDescription>
            Upload een materiaallijst en selecteer de regels die je wilt importeren
          </DialogDescription>
        </DialogHeader>

        {!parsedData && !parseCSV.isPending ? (
          <>
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
                <p className="font-medium">Klik of sleep een CSV hierheen</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Verwacht formaat: puntkomma-gescheiden, 4 rijen metadata, header op rij 5
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={handleClose}>Sluiten</Button>
            </DialogFooter>
          </>
        ) : !parsedData && parseCSV.isPending ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">CSV wordt ingelezen...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Metadata */}
            <div className="rounded-lg border p-4 bg-muted/50">
              <h3 className="font-medium mb-2">Metadata</h3>
              <div className="text-sm space-y-1">
                {Object.entries(parsedData.metadata).map(([key, value]) => (
                  <p key={key}><strong>{key}:</strong> {value as string}</p>
                ))}
              </div>
            </div>

            {/* Row Selection */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {selectedRows.size} van {parsedData.rows.length} regels geselecteerd
              </p>
              <Button variant="outline" size="sm" onClick={toggleAll}>
                {selectedRows.size === parsedData.rows.length ? 'Alles deselecteren' : 'Alles selecteren'}
              </Button>
            </div>

            {/* Table */}
            <div className="border rounded-lg overflow-x-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedRows.size === parsedData.rows.length}
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                    <TableHead>Rij</TableHead>
                    {parsedData.headers.map((header: string, idx: number) => (
                      <TableHead key={idx}>{header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.rows.map((row: any) => (
                    <TableRow key={row.row_number}>
                      <TableCell>
                        <Checkbox
                          checked={selectedRows.has(row.row_number)}
                          onCheckedChange={() => toggleRow(row.row_number)}
                        />
                      </TableCell>
                      <TableCell>{row.row_number}</TableCell>
                      <TableCell>{row.projectcode}</TableCell>
                      <TableCell>{row.fasenr}</TableCell>
                      <TableCell>{row.posnr}</TableCell>
                      <TableCell>{row.profiel}</TableCell>
                      <TableCell>{row.aantal}</TableCell>
                      <TableCell>{row.lengte}</TableCell>
                      <TableCell>{row.kwaliteit}</TableCell>
                      <TableCell>{row.gewicht}</TableCell>
                      <TableCell>{row.zaag}</TableCell>
                      <TableCell>{row.opmerkingen}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Annuleren
              </Button>
              <Button
                onClick={handleImport}
                disabled={selectedRows.size === 0 || addLineItems.isPending}
              >
                {addLineItems.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importeren...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Importeren ({selectedRows.size} regels)
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
