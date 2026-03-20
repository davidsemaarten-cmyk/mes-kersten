import type { ReactNode } from 'react'
import { Ruler, Move, Layers, Triangle, Circle, Trash2 } from 'lucide-react'
import { Button } from '../../ui/button'
import { Tooltip } from '../../ui/tooltip'
import type { MeasurementMode, MeasurementPhase } from './types'

// ── Props ─────────────────────────────────────────────────────────────────────

interface MeasurementToolbarProps {
  mode: MeasurementMode
  phase: MeasurementPhase
  onModeChange: (mode: MeasurementMode) => void
  onClearAll: () => void
  measurementCount: number
  disabled?: boolean
}

// ── Mode buttons config ───────────────────────────────────────────────────────

const MODE_BUTTONS: {
  mode: MeasurementMode
  icon: ReactNode
  label: string
  hint: string
}[] = [
  {
    mode: 'point-to-point',
    icon: <Move className="h-4 w-4" />,
    label: 'Punt-tot-punt',
    hint: 'Klik twee punten om de afstand te meten',
  },
  {
    mode: 'face-distance',
    icon: <Layers className="h-4 w-4" />,
    label: 'Vlakafstand',
    hint: 'Klik twee vlakken om de onderlinge afstand te meten',
  },
  {
    mode: 'face-angle',
    icon: <Triangle className="h-4 w-4" />,
    label: 'Hoek',
    hint: 'Klik twee vlakken om de hoek te meten',
  },
  {
    mode: 'radius',
    icon: <Circle className="h-4 w-4" />,
    label: 'Radius',
    hint: 'Klik een gebogen vlak om de straal te berekenen',
  },
]

// ── Phase instruction ─────────────────────────────────────────────────────────

function phaseInstruction(mode: MeasurementMode, phase: MeasurementPhase): string | null {
  if (mode === 'none' || phase === 'idle') return null
  if (phase === 'picking_first') {
    switch (mode) {
      case 'point-to-point': return 'Klik eerste punt'
      case 'face-distance':  return 'Klik eerste vlak'
      case 'face-angle':     return 'Klik eerste vlak'
      case 'radius':         return 'Klik gebogen vlak'
    }
  }
  if (phase === 'picking_second') {
    switch (mode) {
      case 'point-to-point': return 'Klik tweede punt'
      case 'face-distance':  return 'Klik tweede vlak'
      case 'face-angle':     return 'Klik tweede vlak'
    }
  }
  return null
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MeasurementToolbar({
  mode,
  phase,
  onModeChange,
  onClearAll,
  measurementCount,
  disabled = false,
}: MeasurementToolbarProps) {
  const instruction = phaseInstruction(mode, phase)

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Phase instruction hint */}
      {instruction && (
        <span className="text-xs text-amber-600 font-medium animate-pulse bg-black/60 rounded px-2 py-0.5">
          {instruction}
        </span>
      )}
      {/* Ruler group indicator */}
      <div className="flex items-center gap-1 px-2 h-9 rounded-full border border-border/60 bg-background/90 backdrop-blur shadow-lg">
        <Ruler className="h-3.5 w-3.5 text-muted-foreground shrink-0" />

        {/* Mode buttons */}
        {MODE_BUTTONS.map(({ mode: btnMode, icon, label, hint }) => (
          <Tooltip key={btnMode} content={<><span className="font-medium">{label}</span><br /><span className="opacity-70">{hint}</span></>}>
            <Button
              variant="ghost"
              size="icon"
              disabled={disabled}
              aria-label={label}
              aria-pressed={mode === btnMode}
              onClick={() => onModeChange(btnMode)}
              className={[
                'h-6 w-6 rounded',
                mode === btnMode
                  ? 'bg-amber-500/20 text-amber-600 ring-1 ring-amber-500/30'
                  : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {icon}
            </Button>
          </Tooltip>
        ))}

        {/* Divider + count/clear when measurements exist */}
        {measurementCount > 0 && (
          <>
            <div className="w-px h-4 bg-border mx-0.5" />
            <span className="text-xs text-muted-foreground tabular-nums px-1">
              {measurementCount}
            </span>
            <Tooltip content="Alle metingen wissen">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Alle metingen wissen"
                onClick={onClearAll}
                className="h-6 w-6 rounded text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </Tooltip>
          </>
        )}
      </div>

    </div>
  )
}
