/**
 * AddPlatesModal component
 * Modal for adding one or multiple plates with cascading material selection
 */

import { useState, useMemo, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Textarea } from './ui/textarea'
import { useMaterials, useCreatePlates } from '../hooks/usePlateStock'
import { useStorageLocations } from '../hooks/useStorageLocations'
import type { PlateCreate } from '../types/database'
import { calculatePlateArea } from '../lib/utils'

interface AddPlatesModalProps {
  open: boolean
  onClose: () => void
}

const INITIAL_FORM_DATA = {
  material_prefix: '',
  quality: '',
  thickness: 0,
  width: 0,
  length: 0,
  weight: undefined as number | undefined,
  location: '',
  heatnummer: '',
  notes: '',
  aantal: 1
}

export function AddPlatesModal({ open, onClose }: AddPlatesModalProps) {
  const { data: materials } = useMaterials()
  const createPlates = useCreatePlates()
  const { data: storageLocations } = useStorageLocations(false)

  // Material selection state
  const [selectedMaterialGroep, setSelectedMaterialGroep] = useState<string>('')
  const [selectedSpecificatie, setSelectedSpecificatie] = useState<string>('')
  const [selectedOppervlaktebewerking, setSelectedOppervlaktebewerking] = useState<string>('')

  // Common dimensions
  const [useCustomWidth, setUseCustomWidth] = useState(false)
  const [useCustomLength, setUseCustomLength] = useState(false)

  const [formData, setFormData] = useState<PlateCreate & { aantal: number }>(INITIAL_FORM_DATA)

  // Common plate dimensions (in mm)
  const commonWidths = [1000, 1250, 1500, 2000, 2500, 3000]
  const commonLengths = [2000, 2500, 3000, 4000, 5000, 6000]

  // Get unique materiaalgroepen
  const materiaalgroepen = useMemo(() => {
    if (!materials) return []
    const unique = [...new Set(materials.map(m => m.materiaalgroep))]
    return unique.sort()
  }, [materials])

  // Get specificaties for selected materiaalgroep
  const specificaties = useMemo(() => {
    if (!materials || !selectedMaterialGroep) return []
    const filtered = materials.filter(m => m.materiaalgroep === selectedMaterialGroep)
    const unique = [...new Set(filtered.map(m => m.specificatie).filter(s => s !== null))]
    return unique.sort()
  }, [materials, selectedMaterialGroep])

  // Get oppervlaktebewerkingen for selected materiaalgroep and specificatie
  const oppervlaktebewerkingen = useMemo(() => {
    if (!materials || !selectedMaterialGroep) return []
    const filtered = materials.filter(m => {
      if (m.materiaalgroep !== selectedMaterialGroep) return false
      // If specificaties exist for this groep, filter by selected specificatie
      if (specificaties.length > 0 && selectedSpecificatie) {
        return m.specificatie === selectedSpecificatie
      }
      // If no specificatie is selected and specificaties exist, don't show anything
      if (specificaties.length > 0 && !selectedSpecificatie) {
        return false
      }
      // If no specificaties exist for this groep, just filter by groep
      return true
    })
    const unique = [...new Set(filtered.map(m => m.oppervlaktebewerking))]
    return unique.sort()
  }, [materials, selectedMaterialGroep, selectedSpecificatie, specificaties])

  // Get the final material based on all selections
  const selectedMaterial = useMemo(() => {
    if (!materials || !selectedMaterialGroep || !selectedOppervlaktebewerking) return null

    return materials.find(m => {
      if (m.materiaalgroep !== selectedMaterialGroep) return false
      if (m.oppervlaktebewerking !== selectedOppervlaktebewerking) return false

      // Check specificatie match
      if (specificaties.length > 0) {
        return m.specificatie === (selectedSpecificatie || null)
      }

      return true
    })
  }, [materials, selectedMaterialGroep, selectedSpecificatie, selectedOppervlaktebewerking, specificaties])

  // Update material_prefix when selection changes
  useEffect(() => {
    if (selectedMaterial) {
      setFormData(prev => ({ ...prev, material_prefix: selectedMaterial.plaatcode_prefix }))
    }
  }, [selectedMaterial])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const { aantal, ...plateData } = formData

    // Set quality to "Standaard" since it's no longer in the form
    const plateDataWithQuality = {
      ...plateData,
      quality: 'Standaard'
    }

    try {
      await createPlates.mutateAsync({
        data: plateDataWithQuality,
        aantal
      })

      // Reset form and close
      setSelectedMaterialGroep('')
      setSelectedSpecificatie('')
      setSelectedOppervlaktebewerking('')
      setUseCustomWidth(false)
      setUseCustomLength(false)
      setFormData(INITIAL_FORM_DATA)
      onClose()
    } catch (error) {
      // Error handled by mutation
    }
  }

  // Handle materiaalgroep change
  const handleMaterialGroepChange = (value: string) => {
    setSelectedMaterialGroep(value)
    setSelectedSpecificatie('')
    setSelectedOppervlaktebewerking('')
    setFormData(prev => ({ ...prev, material_prefix: '' }))
  }

  // Handle specificatie change
  const handleSpecificatieChange = (value: string) => {
    setSelectedSpecificatie(value)
    setSelectedOppervlaktebewerking('')
    setFormData(prev => ({ ...prev, material_prefix: '' }))
  }

  // Handle oppervlaktebewerking change
  const handleOppervlaktebewerkingChange = (value: string) => {
    setSelectedOppervlaktebewerking(value)
  }

  const calculateArea = () => {
    if (formData.width && formData.length) {
      return calculatePlateArea(formData.width, formData.length)
    }
    return '0.000'
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Platen Toevoegen</DialogTitle>
          <DialogDescription>
            Selecteer het materiaal en voer de plaatgegevens in
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Material Selection - 3 Cascading Dropdowns */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
            <h3 className="text-sm font-medium">Materiaal Selectie *</h3>

            {/* Materiaalgroep */}
            <div className="space-y-2">
              <Label htmlFor="materiaalgroep">Materiaalgroep</Label>
              <Select
                value={selectedMaterialGroep}
                onValueChange={handleMaterialGroepChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer materiaalgroep" />
                </SelectTrigger>
                <SelectContent>
                  {materiaalgroepen.map((groep) => (
                    <SelectItem key={`groep-${groep}`} value={groep}>
                      {groep}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Specificatie (only if available for selected materiaalgroep) */}
            {specificaties.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="specificatie">Specificatie</Label>
                <Select
                  value={selectedSpecificatie}
                  onValueChange={handleSpecificatieChange}
                  disabled={!selectedMaterialGroep}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer specificatie" />
                  </SelectTrigger>
                  <SelectContent>
                    {specificaties.map((spec) => (
                      <SelectItem key={`spec-${spec}`} value={spec || ''}>
                        {spec}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Oppervlaktebewerking */}
            <div className="space-y-2">
              <Label htmlFor="oppervlaktebewerking">Oppervlaktebewerking</Label>
              <Select
                value={selectedOppervlaktebewerking}
                onValueChange={handleOppervlaktebewerkingChange}
                disabled={!selectedMaterialGroep || (specificaties.length > 0 && !selectedSpecificatie)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer oppervlaktebewerking" />
                </SelectTrigger>
                <SelectContent>
                  {oppervlaktebewerkingen.map((bewerking) => (
                    <SelectItem key={`bewerking-${bewerking}`} value={bewerking}>
                      {bewerking}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Show selected material info */}
            {selectedMaterial && (
              <div className="p-3 bg-primary/10 rounded-md">
                <p className="text-sm font-medium">
                  Geselecteerd materiaal: {selectedMaterial.plaatcode_prefix}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedMaterial.materiaalgroep}
                  {selectedMaterial.specificatie && ` - ${selectedMaterial.specificatie}`}
                  {' - '}{selectedMaterial.oppervlaktebewerking}
                </p>
              </div>
            )}
          </div>

          {/* Dimensions Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="thickness">Dikte (mm) *</Label>
              <Input
                id="thickness"
                type="number"
                step="0.1"
                min="0.1"
                max="500"
                value={formData.thickness || ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value)
                  setFormData({ ...formData, thickness: isNaN(val) ? 0 : Math.max(0, val) })
                }}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="width">Breedte (mm) *</Label>
              {!useCustomWidth ? (
                <Select
                  value={formData.width.toString()}
                  onValueChange={(value) => {
                    if (value === 'custom') {
                      setUseCustomWidth(true)
                      setFormData({ ...formData, width: 0 })
                    } else {
                      setFormData({ ...formData, width: parseInt(value) })
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer breedte" />
                  </SelectTrigger>
                  <SelectContent>
                    {commonWidths.map((w) => (
                      <SelectItem key={`width-${w}`} value={w.toString()}>
                        {w} mm
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Aangepaste maat...</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    value={formData.width || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, width: parseInt(e.target.value) })
                    }
                    placeholder="Voer breedte in"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setUseCustomWidth(false)
                      setFormData({ ...formData, width: 0 })
                    }}
                  >
                    Kies
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="length">Lengte (mm) *</Label>
              {!useCustomLength ? (
                <Select
                  value={formData.length.toString()}
                  onValueChange={(value) => {
                    if (value === 'custom') {
                      setUseCustomLength(true)
                      setFormData({ ...formData, length: 0 })
                    } else {
                      setFormData({ ...formData, length: parseInt(value) })
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer lengte" />
                  </SelectTrigger>
                  <SelectContent>
                    {commonLengths.map((l) => (
                      <SelectItem key={`length-${l}`} value={l.toString()}>
                        {l} mm
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Aangepaste maat...</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    value={formData.length || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, length: parseInt(e.target.value) })
                    }
                    placeholder="Voer lengte in"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setUseCustomLength(false)
                      setFormData({ ...formData, length: 0 })
                    }}
                  >
                    Kies
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Calculated Area */}
          {formData.width && formData.length && (
            <div className="p-3 bg-muted rounded-md">
              <span className="text-sm font-medium">
                Oppervlakte: {calculateArea()} m²
              </span>
            </div>
          )}

          {/* Weight */}
          <div className="space-y-2">
            <Label htmlFor="weight">Gewicht (kg)</Label>
            <Input
              id="weight"
              type="number"
              step="0.01"
              min="0"
              value={formData.weight || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  weight: e.target.value ? parseFloat(e.target.value) : undefined
                })
              }
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Locatie</Label>
            <Select
              value={formData.location}
              onValueChange={(value) =>
                setFormData({ ...formData, location: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecteer locatie" />
              </SelectTrigger>
              <SelectContent>
                {storageLocations?.map((loc) => (
                  <SelectItem key={`location-${loc.id}`} value={loc.naam}>
                    {loc.naam}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Heat Number */}
          <div className="space-y-2">
            <Label htmlFor="heatnummer">
              Heatnummer <span className="text-sm text-gray-500">(optioneel)</span>
            </Label>
            <Input
              id="heatnummer"
              type="text"
              placeholder="Bijv. HEAT-2024-12345"
              maxLength={100}
              value={formData.heatnummer}
              onChange={(e) =>
                setFormData({ ...formData, heatnummer: e.target.value })
              }
            />
            <p className="text-xs text-gray-500">
              Heat/batch certificeringsnummer voor materiaal traceerbaarheid
            </p>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="aantal">Aantal identieke platen *</Label>
            <Input
              id="aantal"
              type="number"
              min="1"
              max="100"
              value={formData.aantal}
              onChange={(e) =>
                setFormData({ ...formData, aantal: parseInt(e.target.value) })
              }
              required
            />
            <p className="text-sm text-muted-foreground">
              Plaatnummers worden automatisch gegenereerd
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Opmerkingen</Label>
            <Textarea
              id="notes"
              rows={3}
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuleren
            </Button>
            <Button
              type="submit"
              disabled={createPlates.isPending || !selectedMaterial || formData.thickness <= 0 || formData.width <= 0 || formData.length <= 0}
            >
              {createPlates.isPending ? 'Aanmaken...' : 'Aanmaken'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
