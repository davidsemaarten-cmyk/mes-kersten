import { useCallback, useState } from 'react'
import { useUploadDXFFiles } from '../hooks/useLaserplanner'
import { Button } from './ui/button'
import { Loader2, UploadCloud, X } from 'lucide-react'

interface DXFUploadZoneProps {
  jobId: string
  importId?: string
  onDone?: () => void
}

export function DXFUploadZone({ jobId, importId, onDone }: DXFUploadZoneProps) {
  const uploadDXF = useUploadDXFFiles()
  const [dragging, setDragging] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])

  const addFiles = (incoming: FileList | File[]) => {
    const dxf = Array.from(incoming).filter((f) =>
      f.name.toLowerCase().endsWith('.dxf')
    )
    setPendingFiles((prev) => {
      const names = new Set(prev.map((f) => f.name))
      return [...prev, ...dxf.filter((f) => !names.has(f.name))]
    })
  }

  const removeFile = (name: string) =>
    setPendingFiles((prev) => prev.filter((f) => f.name !== name))

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }, [])

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files)
    e.target.value = ''
  }

  const handleUpload = async () => {
    if (!pendingFiles.length) return
    await uploadDXF.mutateAsync({ jobId, files: pendingFiles, importId })
    setPendingFiles([])
    onDone?.()
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-colors select-none
          ${dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-muted-foreground/60'}
        `}
        onClick={() => document.getElementById('dxf-file-input')?.click()}
      >
        <input
          id="dxf-file-input"
          type="file"
          accept=".dxf"
          multiple
          className="hidden"
          onChange={onFileInput}
        />
        <UploadCloud className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium">Sleep DXF bestanden hierheen</p>
        <p className="text-xs text-muted-foreground mt-1">of klik om te bladeren — meerdere bestanden tegelijk</p>
      </div>

      {/* Pending file list */}
      {pendingFiles.length > 0 && (
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {pendingFiles.map((f) => (
            <div
              key={f.name}
              className="flex items-center justify-between text-sm bg-muted/40 rounded px-3 py-1.5"
            >
              <span className="font-mono truncate max-w-xs">{f.name}</span>
              <button
                type="button"
                onClick={() => removeFile(f.name)}
                className="ml-2 text-muted-foreground hover:text-destructive shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {pendingFiles.length > 0 && (
        <Button
          onClick={handleUpload}
          disabled={uploadDXF.isPending}
          className="w-full"
        >
          {uploadDXF.isPending ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploaden...</>
          ) : (
            <><UploadCloud className="h-4 w-4 mr-2" />Koppelen ({pendingFiles.length} bestanden)</>
          )}
        </Button>
      )}
    </div>
  )
}
