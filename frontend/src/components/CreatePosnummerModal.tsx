/**
 * Modal for creating a new posnummer (part number)
 * Provides form with material, dimensions, quantity, and notes
 */

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreatePosnummer } from '@/hooks/usePosnummers'
import { toast } from 'sonner'
import type { PosnummerCreate } from '@/types/database'

interface CreatePosnummerModalProps {
  faseId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Common material options
const MATERIALS = [
  'S235',
  'S355',
  'RVS 304',
  'RVS 316',
  'ALU 5083',
  'ALU 6061',
  'C45',
  'Anders'
]

export function CreatePosnummerModal({ faseId, open, onOpenChange }: CreatePosnummerModalProps) {
  const [formData, setFormData] = useState<PosnummerCreate>({
    posnr: '',
    materiaal: '',
    profiel: null,
    length_mm: null,
    width_mm: null,
    height_mm: null,
    quantity: 1,
    notes: null,
  })

  const createMutation = useCreatePosnummer(faseId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.posnr || !formData.materiaal) {
      toast.error('Posnummer en materiaal zijn verplicht')
      return
    }

    try {
      await createMutation.mutateAsync(formData)
      toast.success(`Posnummer ${formData.posnr} aangemaakt`)
      onOpenChange(false)
      // Reset form
      setFormData({
        posnr: '',
        materiaal: '',
        profiel: null,
        length_mm: null,
        width_mm: null,
        height_mm: null,
        quantity: 1,
        notes: null,
      })
    } catch (error: any) {
      const message = error?.response?.data?.detail || 'Fout bij aanmaken posnummer'
      toast.error(message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nieuw Posnummer</DialogTitle>
          <DialogDescription>Voeg een posnummer toe aan deze fase.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Posnummer */}
            <div className="space-y-2">
              <Label htmlFor="posnr">
                Posnummer <span className="text-red-500">*</span>
              </Label>
              <Input
                id="posnr"
                placeholder="001"
                value={formData.posnr}
                onChange={(e) => setFormData({ ...formData, posnr: e.target.value })}
                required
              />
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity">Aantal</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity || 1}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          {/* Material */}
          <div className="space-y-2">
            <Label htmlFor="materiaal">
              Materiaal <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.materiaal}
              onValueChange={(value) => setFormData({ ...formData, materiaal: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecteer materiaal..." />
              </SelectTrigger>
              <SelectContent>
                {MATERIALS.map((material) => (
                  <SelectItem key={material} value={material}>
                    {material}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.materiaal === 'Anders' && (
              <Input
                placeholder="Vul materiaal in..."
                value={formData.materiaal === 'Anders' ? '' : formData.materiaal}
                onChange={(e) => setFormData({ ...formData, materiaal: e.target.value })}
                className="mt-2"
              />
            )}
          </div>

          {/* Profiel (optional) */}
          <div className="space-y-2">
            <Label htmlFor="profiel">Profiel (optioneel)</Label>
            <Input
              id="profiel"
              placeholder="bijv. IPE 200, Rechthoekige buis 40x40x3"
              value={formData.profiel || ''}
              onChange={(e) => setFormData({ ...formData, profiel: e.target.value || null })}
            />
          </div>

          {/* Dimensions */}
          <div className="space-y-2">
            <Label>Afmetingen (mm)</Label>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="length" className="text-xs text-muted-foreground">
                  Lengte
                </Label>
                <Input
                  id="length"
                  type="number"
                  min="0"
                  placeholder="1000"
                  value={formData.length_mm || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, length_mm: e.target.value ? parseInt(e.target.value) : null })
                  }
                />
              </div>
              <div>
                <Label htmlFor="width" className="text-xs text-muted-foreground">
                  Breedte
                </Label>
                <Input
                  id="width"
                  type="number"
                  min="0"
                  placeholder="500"
                  value={formData.width_mm || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, width_mm: e.target.value ? parseInt(e.target.value) : null })
                  }
                />
              </div>
              <div>
                <Label htmlFor="height" className="text-xs text-muted-foreground">
                  Hoogte
                </Label>
                <Input
                  id="height"
                  type="number"
                  min="0"
                  placeholder="200"
                  value={formData.height_mm || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, height_mm: e.target.value ? parseInt(e.target.value) : null })
                  }
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notities (optioneel)</Label>
            <Textarea
              id="notes"
              placeholder="Extra informatie over dit onderdeel..."
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Aanmaken...' : 'Aanmaken'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
