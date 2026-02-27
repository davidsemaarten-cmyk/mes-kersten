/**
 * ColumnFilter Component
 * Phase 4: Advanced Table Filtering with Combobox
 *
 * Combobox (dropdown + search) for filtering table columns with debouncing,
 * suggestions from unique values, and clear button functionality.
 */

import * as React from 'react'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover'

interface ColumnFilterProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  options?: string[]  // Unique values for suggestions
}

export function ColumnFilter({ value, onChange, placeholder, options = [] }: ColumnFilterProps) {
  const [open, setOpen] = React.useState(false)
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

  // Filter options based on current input
  const filteredOptions = React.useMemo(() => {
    if (!localValue) return options.slice(0, 20) // Show max 20 when empty
    const query = localValue.toLowerCase()
    return options.filter(opt =>
      opt.toLowerCase().includes(query)
    ).slice(0, 20) // Limit to 20 results
  }, [options, localValue])

  const handleSelect = (selectedValue: string) => {
    setLocalValue(selectedValue)
    onChange(selectedValue)
    setOpen(false)
  }

  const handleClear = () => {
    setLocalValue('')
    onChange('')
    setOpen(false)
  }

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-8 text-sm w-full justify-between font-normal px-2 border-gray-200 hover:border-blue-400 focus:border-blue-400"
          >
            <span className={cn(
              "truncate",
              !localValue && "text-gray-400"
            )}>
              {localValue || placeholder}
            </span>
            <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder={placeholder}
              value={localValue}
              onValueChange={setLocalValue}
            />
            <CommandList>
              {filteredOptions.length === 0 && (
                <CommandEmpty>Geen suggesties</CommandEmpty>
              )}
              {filteredOptions.length > 0 && (
                <CommandGroup>
                  {filteredOptions.map((option) => (
                    <CommandItem
                      key={option}
                      value={option}
                      onSelect={() => handleSelect(option)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-3 w-3",
                          localValue === option ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="truncate">{option}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {localValue && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-8 w-6 p-0 hover:bg-transparent"
          onClick={(e) => {
            e.stopPropagation()
            handleClear()
          }}
        >
          <X className="h-3 w-3 text-gray-400 hover:text-gray-600" />
        </Button>
      )}
    </div>
  )
}
