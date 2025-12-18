/**
 * RemnantModal Component
 * Phase 8: Laser workflow - Process plate remnant
 *
 * Modal form for creating remnant plates after laser cutting
 */

import { useState, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
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
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Scissors, Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import type { PlateWithRelations } from '../types/database'

interface RemnantModalProps {
  plate: PlateWithRelations
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RemnantModal({ plate, open, onOpenChange }: RemnantModalProps) {
  const [newWidth, setNewWidth] = useState('')
  const [newLength, setNewLength] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [locationOpen, setLocationOpen] = useState(false)
  const queryClient = useQueryClient()

  // Get all plates to extract unique locations
  const plates = queryClient.getQueryData<PlateWithRelations[]>(['plates']) || []

  // Extract unique locations from existing plates
  const locations = useMemo(() => {
    const uniqueLocations = Array.from(
      new Set(
        plates
          .map(p => p.location)
          .filter(Boolean) as string[]
      )
    ).sort()
    return uniqueLocations
  }, [plates])

  // Reset form when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setNewWidth('')
      setNewLength('')
      setNewLocation('')
      setNotes('')
    }
    onOpenChange(newOpen)
  }

  // Validation
  const widthNum = parseInt(newWidth) || 0
  const lengthNum = parseInt(newLength) || 0
  const isValid =
    widthNum > 0 && widthNum < plate.width &&
    lengthNum > 0 && lengthNum < plate.length &&
    newLocation.trim().length > 0

  const handleSubmit = async () => {
    if (!isValid) {
      toast.error('Controleer de invoer')
      return
    }

    setIsLoading(true)
    try {
      const response = await api.post(`/api/platestock/plates/${plate.id}/process-remnant`, {
        new_width: widthNum,
        new_length: lengthNum,
        new_location: newLocation.trim(),
        notes: notes.trim() || undefined
      })

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['plates'] })
      queryClient.invalidateQueries({ queryKey: ['plate', plate.id] })

      const remnantPlate = response.data.remnant_plate
      toast.success(
        `Restant ${remnantPlate.plate_number} aangemaakt, origineel ${plate.plate_number} verbruikt`
      )
      handleOpenChange(false)
    } catch (error: any) {
      console.error('Error processing remnant:', error)
      toast.error(error.response?.data?.detail || 'Fout bij verwerken restant')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Restant Verwerken</DialogTitle>
          <DialogDescription>
            Maak een nieuwe plaat aan met de restant afmetingen van {plate.plate_number}.
            Het origineel wordt geregistreerd als verbruikt.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Original plate info */}
          <div className="bg-gray-50 p-3 rounded-md space-y-1">
            <p className="text-sm font-medium text-gray-700">Originele plaat</p>
            <div className="grid grid-cols-3 gap-2 text-sm text-gray-600">
              <div>
                <span className="text-gray-500">Breedte:</span> {plate.width} mm
              </div>
              <div>
                <span className="text-gray-500">Lengte:</span> {plate.length} mm
              </div>
              <div>
                <span className="text-gray-500">Dikte:</span> {plate.thickness} mm
              </div>
            </div>
          </div>

          {/* New dimensions */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new-width">
                Nieuwe Breedte <span className="text-red-500">*</span>
              </Label>
              <Input
                id="new-width"
                type="number"
                placeholder="mm"
                value={newWidth}
                onChange={(e) => setNewWidth(e.target.value)}
                min={1}
                max={plate.width - 1}
              />
              {widthNum > 0 && widthNum >= plate.width && (
                <p className="text-xs text-red-600">
                  Moet kleiner zijn dan {plate.width} mm
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-length">
                Nieuwe Lengte <span className="text-red-500">*</span>
              </Label>
              <Input
                id="new-length"
                type="number"
                placeholder="mm"
                value={newLength}
                onChange={(e) => setNewLength(e.target.value)}
                min={1}
                max={plate.length - 1}
              />
              {lengthNum > 0 && lengthNum >= plate.length && (
                <p className="text-xs text-red-600">
                  Moet kleiner zijn dan {plate.length} mm
                </p>
              )}
            </div>
          </div>

          {/* Location dropdown */}
          <div className="space-y-2">
            <Label htmlFor="new-location">
              Locatie <span className="text-red-500">*</span>
            </Label>
            <Popover open={locationOpen} onOpenChange={setLocationOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={locationOpen}
                  className="w-full justify-between"
                >
                  {newLocation || "Selecteer locatie..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
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
                            setNewLocation(value)
                            setLocationOpen(false)
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              newLocation === location ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {location}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notities (optioneel)</Label>
            <Textarea
              id="notes"
              placeholder="Bijv. project waarvoor gebruikt..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={1000}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Annuleren
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Scissors className="h-4 w-4 mr-2" />
            {isLoading ? 'Bezig...' : 'Restant Aanmaken'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
