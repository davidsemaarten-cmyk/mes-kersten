/**
 * FaseCombobox Component
 * Phase 6: Searchable combobox for selecting project phases
 *
 * Fetches fases from a selected project and provides search/autocomplete
 * Returns fase ID instead of fase_nummer for API compatibility
 */

import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useFases } from '@/hooks/useProjects'

interface FaseComboboxProps {
  projectId: string | null
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function FaseCombobox({
  projectId,
  value,
  onValueChange,
  placeholder = "Selecteer fase...",
  disabled = false,
  className,
}: FaseComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const { data: fases = [], isLoading } = useFases(projectId || undefined)

  const selectedFase = fases.find((f) => f.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isLoading || !projectId}
          className={cn("w-full justify-between", className)}
        >
          {selectedFase
            ? `${selectedFase.fase_nummer} - ${selectedFase.beschrijving || 'Fase'}`
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Zoek fase..." />
          <CommandList>
            <CommandEmpty>
              {projectId ? 'Geen fases gevonden.' : 'Selecteer eerst een project.'}
            </CommandEmpty>
            <CommandGroup className="max-h-[300px] overflow-y-auto">
              {fases.map((fase) => (
                <CommandItem
                  key={fase.id}
                  value={`${fase.fase_nummer} ${fase.beschrijving || ''}`}
                  onSelect={() => {
                    onValueChange(fase.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === fase.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {fase.fase_nummer}
                  {fase.beschrijving && ` - ${fase.beschrijving}`}
                  {fase.status && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {fase.status}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
