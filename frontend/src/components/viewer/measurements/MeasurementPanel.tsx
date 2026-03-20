import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, Ruler, X, Move, Layers, Triangle, Circle } from 'lucide-react'
import { Button } from '../../ui/button'
import { cn } from '../../../lib/utils'
import type { MeasurementResult } from './types'

// ── Props ─────────────────────────────────────────────────────────────────────

interface MeasurementPanelProps {
  results: MeasurementResult[]
  onDelete: (id: string) => void
}

// ── Type display config ───────────────────────────────────────────────────────

function getResultDisplay(result: MeasurementResult): {
  icon: React.ReactNode
  label: string
  value: string
  detail: string | null
  colorClass: string
  dotClass: string
} {
  switch (result.kind) {
    case 'point-to-point':
      return {
        icon: <Move className="h-3.5 w-3.5" />,
        label: 'Punt-tot-punt',
        value: `${result.distance.toFixed(2)} mm`,
        detail: null,
        colorClass: 'text-blue-600',
        dotClass: 'bg-blue-500',
      }
    case 'face-distance':
      return {
        icon: <Layers className="h-3.5 w-3.5" />,
        label: 'Vlakafstand',
        value: `${result.distance.toFixed(2)} mm`,
        detail: result.parallel ? 'evenwijdige vlakken' : 'niet-evenwijdig',
        colorClass: 'text-green-600',
        dotClass: 'bg-green-500',
      }
    case 'face-angle':
      return {
        icon: <Triangle className="h-3.5 w-3.5" />,
        label: 'Hoek',
        value: `${result.includedAngleDeg.toFixed(1)}°`,
        detail: `buighoek ${result.bendAngleDeg.toFixed(1)}°`,
        colorClass: 'text-yellow-600',
        dotClass: 'bg-yellow-500',
      }
    case 'radius':
      return {
        icon: <Circle className="h-3.5 w-3.5" />,
        label: 'Radius / diameter',
        value: `R ${result.radius.toFixed(2)} mm`,
        detail: `Ø ${result.diameter.toFixed(2)} mm`,
        colorClass: 'text-purple-600',
        dotClass: 'bg-purple-500',
      }
  }
}

// ── Result row ────────────────────────────────────────────────────────────────

function ResultRow({
  result,
  onDelete,
}: {
  result: MeasurementResult
  onDelete: (id: string) => void
}) {
  const [hovered, setHovered] = useState(false)
  const display = getResultDisplay(result)

  return (
    <div
      className="group flex items-start gap-2 py-1.5 px-2 rounded hover:bg-muted/50 transition-colors"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Color dot */}
      <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${display.dotClass}`} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`${display.colorClass} shrink-0`}>{display.icon}</span>
          <span
            className="font-mono text-sm font-semibold text-foreground"
            style={{ fontFamily: 'ui-monospace, "Cascadia Code", monospace' }}
          >
            {display.value}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-xs text-muted-foreground">{display.label}</span>
          {display.detail && (
            <span className="text-xs text-muted-foreground">· {display.detail}</span>
          )}
        </div>
      </div>

      {/* Delete button (hover only) */}
      <Button
        variant="ghost"
        size="icon"
        aria-label="Meting verwijderen"
        onClick={() => onDelete(result.id)}
        className={cn(
          'h-5 w-5 rounded shrink-0 transition-opacity',
          hovered ? 'opacity-100' : 'opacity-0',
        )}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export function MeasurementPanel({ results, onDelete }: MeasurementPanelProps) {
  const [collapsed, setCollapsed] = useState(false)

  // Auto-expand when new measurement is added
  useEffect(() => {
    if (results.length > 0) {
      setCollapsed(false)
    }
  }, [results.length])

  if (results.length === 0) return null

  return (
    <div
      className="absolute top-3 right-3 z-10 w-56 rounded-lg border border-border bg-background/95 shadow-md backdrop-blur-sm"
      style={{ maxHeight: '60vh' }}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setCollapsed(prev => !prev)}
        className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors rounded-t-lg"
      >
        <Ruler className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs font-medium text-foreground flex-1">
          Metingen
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {results.length}
        </span>
        {collapsed
          ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          : <ChevronDown  className="h-3.5 w-3.5 text-muted-foreground" />
        }
      </button>

      {/* Results list */}
      {!collapsed && (
        <>
          <div
            className="overflow-y-auto px-1 pb-1"
            style={{ maxHeight: 'calc(60vh - 80px)' }}
          >
            {results.map(result => (
              <ResultRow key={result.id} result={result} onDelete={onDelete} />
            ))}
          </div>

          {/* Footer disclaimer */}
          <div className="px-3 py-1.5 border-t border-border/50 text-xs text-muted-foreground leading-tight">
            Metingen zijn gebaseerd op mesh-benadering
          </div>
        </>
      )}
    </div>
  )
}
