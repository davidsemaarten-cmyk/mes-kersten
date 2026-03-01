import { useMemo, useState } from 'react'
import { CadViewer } from '@cadview/react'
import type { Tool, MeasureEvent } from '@cadview/react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Loader2, AlertTriangle, Move, Ruler } from 'lucide-react'
import { useLaserDXFFileDetail } from '../hooks/useLaserplanner'
import { cn } from '../lib/utils'

interface DXFViewerModalProps {
  open: boolean
  onClose: () => void
  jobId: string
  dxfId: string
  filename: string
}

export function DXFViewerModal({ open, onClose, jobId, dxfId, filename }: DXFViewerModalProps) {
  const [tool, setTool] = useState<Tool>('pan')
  const [lastMeasure, setLastMeasure] = useState<MeasureEvent | null>(null)

  function handleToolChange(next: Tool) {
    setTool(next)
    // Clear the result strip when leaving measure mode
    if (next !== 'measure') setLastMeasure(null)
  }

  const { data: dxfDetail, isLoading, error } = useLaserDXFFileDetail(jobId, dxfId, open)

  // Convert the DXF string to a File object that @cadview/react expects.
  // Re-create only when file_content or filename changes.
  const dxfFile = useMemo<File | null>(() => {
    if (!dxfDetail?.file_content) return null
    return new File([dxfDetail.file_content], filename, { type: 'application/dxf' })
  }, [dxfDetail?.file_content, filename])

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl w-full h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-4 pb-2 shrink-0 flex flex-row items-center justify-between">
          <DialogTitle className="font-mono text-sm">{filename}</DialogTitle>

          {/* Tool switcher — only shown once the file is loaded */}
          {dxfFile && !isLoading && !error && (
            <div className="flex gap-1 mr-8">
              <button
                onClick={() => handleToolChange('pan')}
                title="Navigeren / Zoom"
                className={cn(
                  'flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors',
                  tool === 'pan'
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800'
                )}
              >
                <Move className="h-3.5 w-3.5" />
                Navigeren
              </button>
              <button
                onClick={() => handleToolChange('measure')}
                title="Meten"
                className={cn(
                  'flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors',
                  tool === 'measure'
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800'
                )}
              >
                <Ruler className="h-3.5 w-3.5" />
                Meten
              </button>
            </div>
          )}
        </DialogHeader>

        {/* Viewer area */}
        <div className="relative flex-1 bg-zinc-900 overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            </div>
          )}

          {error && !isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <AlertTriangle className="h-8 w-8 text-red-400" />
              <p className="text-sm text-red-400">Fout bij laden DXF-bestand</p>
            </div>
          )}

          {dxfFile && !isLoading && !error && (
            <>
              <CadViewer
                file={dxfFile}
                theme="dark"
                tool={tool}
                className="w-full h-full"
                onMeasure={setLastMeasure}
              />

              {/* Measurement result — shown while in measure mode after both points are set */}
              {tool === 'measure' && lastMeasure && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-md bg-zinc-800/90 px-4 py-1.5 text-xs font-mono text-zinc-100 shadow-lg pointer-events-none">
                  <span>
                    <span className="text-zinc-400 mr-1">Afstand:</span>
                    {lastMeasure.distance.toFixed(2)} mm
                  </span>
                  <span className="text-zinc-500">|</span>
                  <span>
                    <span className="text-zinc-400 mr-1">ΔX:</span>
                    {Math.abs(lastMeasure.deltaX).toFixed(2)} mm
                  </span>
                  <span className="text-zinc-500">|</span>
                  <span>
                    <span className="text-zinc-400 mr-1">ΔY:</span>
                    {Math.abs(lastMeasure.deltaY).toFixed(2)} mm
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
