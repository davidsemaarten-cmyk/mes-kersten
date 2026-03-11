/**
 * BulkClaimModal component
 * Modal for claiming multiple plates at once
 */

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Checkbox } from './ui/checkbox'
import { usePlates, useBulkClaim } from '../hooks/usePlateStock'
import { PlateCard } from './PlateCard'
import type { PlateWithRelations } from '../types/database'

interface BulkClaimModalProps {
  open: boolean
  onClose: () => void
}

export function BulkClaimModal({ open, onClose }: BulkClaimModalProps) {
  const { data: plates } = usePlates({ include_consumed: false })
  const bulkClaim = useBulkClaim()

  const [projectNaam, setProjectNaam] = useState('')
  const [projectFase, setProjectFase] = useState('')
  const [selectedPlateIds, setSelectedPlateIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')

  const handleTogglePlate = (plateId: string) => {
    const newSelection = new Set(selectedPlateIds)
    if (newSelection.has(plateId)) {
      newSelection.delete(plateId)
    } else {
      newSelection.add(plateId)
    }
    setSelectedPlateIds(newSelection)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedPlateIds.size === 0) {
      return
    }

    try {
      await bulkClaim.mutateAsync({
        plate_ids: Array.from(selectedPlateIds),
        project_naam: projectNaam,
        project_fase: projectFase
      })

      // Reset and close
      setProjectNaam('')
      setProjectFase('')
      setSelectedPlateIds(new Set())
      setSearchQuery('')
      onClose()
    } catch (error) {
      // Error handled by mutation
    }
  }

  const calculateTotalM2 = () => {
    if (!plates) return 0

    return Array.from(selectedPlateIds)
      .reduce((total, plateId) => {
        const plate = plates.find(p => p.id === plateId)
        if (plate) {
          return total + ((plate.width * plate.length) / 1_000_000)
        }
        return total
      }, 0)
      .toFixed(2)
  }

  const filteredPlates = plates?.filter(plate => {
    // Only show available or claimed plates (not consumed, not bij laser)
    if (plate.is_consumed || plate.status === 'bij_laser') return false

    if (!searchQuery) return true

    const query = searchQuery.toLowerCase()
    return (
      plate.plate_number.toLowerCase().includes(query) ||
      plate.material_prefix.toLowerCase().includes(query) ||
      plate.quality.toLowerCase().includes(query) ||
      plate.location?.toLowerCase().includes(query)
    )
  })

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Claim - Meerdere Platen Claimen</DialogTitle>
          <DialogDescription>Claim meerdere platen tegelijk voor een project en fase.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Project Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-md">
            <div className="space-y-2">
              <Label htmlFor="project_naam">Project Naam *</Label>
              <Input
                id="project_naam"
                placeholder="Bijv. STAGR"
                value={projectNaam}
                onChange={(e) => setProjectNaam(e.target.value.toUpperCase())}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project_fase">Fase *</Label>
              <Input
                id="project_fase"
                placeholder="001"
                maxLength={3}
                pattern="\d{3}"
                value={projectFase}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '')
                  setProjectFase(value)
                }}
                required
              />
              <p className="text-xs text-muted-foreground">3 cijfers (001-999)</p>
            </div>
          </div>

          {/* Selection Summary */}
          {selectedPlateIds.size > 0 && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-semibold">{selectedPlateIds.size}</span> platen geselecteerd
                </div>
                <div>
                  Totaal: <span className="font-semibold">{calculateTotalM2()} m²</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPlateIds(new Set())}
                >
                  Deselecteer alles
                </Button>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search">Zoeken</Label>
            <Input
              id="search"
              placeholder="Zoek op plaatnummer, materiaal, kwaliteit, locatie..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Plates Grid */}
          <div className="max-h-96 overflow-y-auto border rounded-md p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPlates?.map((plate) => (
                <div key={plate.id} className="flex items-start gap-3">
                  <Checkbox
                    id={`plate-${plate.id}`}
                    checked={selectedPlateIds.has(plate.id)}
                    onCheckedChange={() => handleTogglePlate(plate.id)}
                    className="mt-4"
                  />
                  <div className="flex-1">
                    <PlateCard plate={plate} />
                  </div>
                </div>
              ))}
            </div>

            {filteredPlates?.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                Geen platen gevonden
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuleren
            </Button>
            <Button
              type="submit"
              disabled={
                bulkClaim.isPending ||
                selectedPlateIds.size === 0 ||
                !projectNaam ||
                projectFase.length !== 3
              }
            >
              {bulkClaim.isPending ? 'Claimen...' : `Claim ${selectedPlateIds.size} platen`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
