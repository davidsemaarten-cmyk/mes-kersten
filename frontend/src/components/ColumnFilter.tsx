/**
 * ColumnFilter Component
 * Phase 4: Advanced Table Filtering
 *
 * Small input field for filtering table columns with debouncing
 * and clear button functionality.
 */

import * as React from 'react'
import { X } from 'lucide-react'
import { Input } from './ui/input'
import { Button } from './ui/button'

interface ColumnFilterProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function ColumnFilter({ value, onChange, placeholder }: ColumnFilterProps) {
  const [localValue, setLocalValue] = React.useState(value)

  // Debounce the filter value (300ms)
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(localValue)
    }, 300)
    return () => clearTimeout(timeout)
  }, [localValue, onChange])

  // Update local value when prop changes
  React.useEffect(() => {
    setLocalValue(value)
  }, [value])

  return (
    <div className="relative">
      <Input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="h-8 text-sm pr-8 border-gray-200 focus:border-blue-400"
      />
      {localValue && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-8 w-8 p-0 hover:bg-transparent"
          onClick={() => {
            setLocalValue('')
            onChange('')
          }}
        >
          <X className="h-3 w-3 text-gray-400 hover:text-gray-600" />
        </Button>
      )}
    </div>
  )
}
