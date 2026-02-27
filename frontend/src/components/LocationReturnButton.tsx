/**
 * LocationReturnButton Component
 * Phase 8: Laser workflow - Return plate to location
 *
 * Inline button with location dropdown for returning plates from laser
 */

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from './ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './ui/command'
import { Check, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { useStorageLocations } from '../hooks/useStorageLocations'
import type { PlateWithRelations } from '../types/database'

interface LocationReturnButtonProps {
  plate: PlateWithRelations
}

export function LocationReturnButton({ plate }: LocationReturnButtonProps) {
  const [open, setOpen] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const queryClient = useQueryClient()

  // Fetch active storage locations from database
  const { data: storageLocations } = useStorageLocations(false)
  const locations = storageLocations?.map(loc => loc.naam) || []

  const handleReturn = async () => {
    if (!selectedLocation) {
      toast.error('Selecteer een locatie')
      return
    }

    setIsLoading(true)
    try {
      await api.post(`/api/platestock/plates/${plate.id}/van-laser`, {
        new_location: selectedLocation
      })

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['plates'] })
      queryClient.invalidateQueries({ queryKey: ['plate', plate.id] })

      toast.success(`Plaat ${plate.plate_number} teruggelegd op locatie ${selectedLocation}`)
      setOpen(false)
      setSelectedLocation('')
    } catch (error: any) {
      console.error('Error returning plate:', error)
      toast.error(error.response?.data?.detail || 'Fout bij terugleggen plaat')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isLoading}
          className="text-blue-600 border-blue-200 hover:bg-blue-50"
        >
          <Package className="h-3 w-3 mr-1" />
          Terugleggen
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="end">
        <Command>
          <CommandInput placeholder="Zoek locatie..." />
          <CommandList>
            <CommandEmpty>Geen locaties gevonden</CommandEmpty>
            <CommandGroup>
              {locations.map((location) => (
                <CommandItem
                  key={location}
                  value={location}
                  onSelect={(value) => {
                    setSelectedLocation(value)
                    // Don't close yet, wait for confirmation
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedLocation === location ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {location}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>

        {/* Confirm button */}
        {selectedLocation && (
          <div className="border-t p-2 bg-gray-50">
            <Button
              onClick={handleReturn}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              {isLoading ? 'Bezig...' : `Terugleggen op ${selectedLocation}`}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
