/**
 * ColumnVisibilityPopover Component
 * Phase 9: UI for showing/hiding table columns
 */

import { Settings } from 'lucide-react'
import { Button } from './ui/button'
import { Checkbox } from './ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover'
import type { ColumnConfig } from '../types/columns'

interface ColumnVisibilityPopoverProps {
  columns: ColumnConfig[]
  onToggle: (columnId: string) => void
  onReset: () => void
  visibleCount: number
  totalCount: number
}

export function ColumnVisibilityPopover({
  columns,
  onToggle,
  onReset,
  visibleCount,
  totalCount
}: ColumnVisibilityPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Kolommen ({visibleCount} van {totalCount})
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px]" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-sm mb-3">Kolommen tonen/verbergen</h4>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {columns.map((column) => {
                const isDisabled = column.visible && visibleCount <= 3

                return (
                  <label
                    key={column.id}
                    className={`flex items-center gap-2 py-1 px-2 rounded hover:bg-gray-50 ${
                      isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                    }`}
                  >
                    <Checkbox
                      checked={column.visible}
                      onCheckedChange={() => onToggle(column.id)}
                      disabled={isDisabled}
                    />
                    <span className="text-sm">{column.label}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {visibleCount <= 3 && (
            <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
              Minimaal 3 kolommen moeten zichtbaar blijven
            </p>
          )}

          <div className="pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="w-full text-sm"
            >
              Reset naar standaard
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
