/**
 * ProjectPhaseCombobox Component
 * Phase 3: Reusable searchable project selection component
 *
 * A combobox that combines dropdown functionality with search/autocomplete
 * for selecting projects. Can be extended to support fase selection.
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
import { useProjects } from '@/hooks/useProjects'

interface ProjectPhaseComboboxProps {
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function ProjectPhaseCombobox({
  value,
  onValueChange,
  placeholder = "Selecteer project...",
  disabled = false,
  className,
}: ProjectPhaseComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const { data: projects = [], isLoading } = useProjects()

  const selectedProject = projects.find((p) => p.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isLoading}
          className={cn("w-full justify-between", className)}
        >
          {selectedProject
            ? `${selectedProject.code} - ${selectedProject.naam}`
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Zoek project..." />
          <CommandList>
            <CommandEmpty>Geen projecten gevonden.</CommandEmpty>
            <CommandGroup className="max-h-[300px] overflow-y-auto">
              {projects.map((project) => (
                <CommandItem
                  key={project.id}
                  value={`${project.code} ${project.naam}`}
                  onSelect={() => {
                    onValueChange(project.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === project.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {project.code} - {project.naam}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
