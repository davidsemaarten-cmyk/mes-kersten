import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { usePrefixSuggestion, useCreateMaterial, useUpdateMaterial } from '../hooks/usePlateStock'
import type { MaterialCreate, Material } from '../types/database'

interface AddMaterialModalProps {
  open: boolean
  onClose: () => void
  material?: Material | null
}

export function AddMaterialModal({ open, onClose, material }: AddMaterialModalProps) {
  const isEditMode = !!material
  const [formData, setFormData] = useState<MaterialCreate>({
    materiaalgroep: '',
    specificatie: null,
    oppervlaktebewerking: '',
    plaatcode_prefix: '',
    kleur: '#9CA3AF'
  })

  const [prefixError, setPrefixError] = useState('')

  const prefixSuggestion = usePrefixSuggestion()
  const createMaterial = useCreateMaterial()
  const updateMaterial = useUpdateMaterial()

  // Initialize form data when material prop changes (for edit mode)
  useEffect(() => {
    if (material) {
      setFormData({
        materiaalgroep: material.materiaalgroep,
        specificatie: material.specificatie,
        oppervlaktebewerking: material.oppervlaktebewerking,
        plaatcode_prefix: material.plaatcode_prefix,
        kleur: material.kleur
      })
    }
  }, [material])

  // Auto-suggest prefix when fields change (only in create mode)
  useEffect(() => {
    if (!isEditMode && formData.materiaalgroep && formData.oppervlaktebewerking) {
      prefixSuggestion.mutate({
        materiaalgroep: formData.materiaalgroep,
        specificatie: formData.specificatie,
        oppervlaktebewerking: formData.oppervlaktebewerking
      }, {
        onSuccess: (data) => {
          setFormData(prev => ({ ...prev, plaatcode_prefix: data.suggestion }))
          setPrefixError(data.is_unique ? '' : 'Deze prefix bestaat al')
        }
      })
    }
  }, [formData.materiaalgroep, formData.specificatie, formData.oppervlaktebewerking, isEditMode])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (prefixError) return

    if (isEditMode && material) {
      // Update existing material
      updateMaterial.mutate(
        {
          id: material.id,
          data: {
            materiaalgroep: formData.materiaalgroep,
            specificatie: formData.specificatie,
            oppervlaktebewerking: formData.oppervlaktebewerking,
            kleur: formData.kleur
            // Note: plaatcode_prefix is NOT updated in edit mode
          }
        },
        {
          onSuccess: () => {
            onClose()
            setFormData({
              materiaalgroep: '',
              specificatie: null,
              oppervlaktebewerking: '',
              plaatcode_prefix: '',
              kleur: '#9CA3AF'
            })
          }
        }
      )
    } else {
      // Create new material
      createMaterial.mutate(formData, {
        onSuccess: () => {
          onClose()
          setFormData({
            materiaalgroep: '',
            specificatie: null,
            oppervlaktebewerking: '',
            plaatcode_prefix: '',
            kleur: '#9CA3AF'
          })
        }
      })
    }
  }

  // Specificatie is now always visible but optional (no conditional logic needed)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Materiaal Bewerken' : 'Nieuw Materiaal Toevoegen'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Wijzig de materiaal eigenschappen. Let op: de plaatcode prefix kan niet worden gewijzigd als er platen bestaan.'
              : 'Vul de materiaal eigenschappen in. De plaatcode prefix wordt automatisch voorgesteld.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Materiaalgroep */}
          <div>
            <Label htmlFor="materiaalgroep">Materiaalgroep *</Label>
            <Input
              id="materiaalgroep"
              value={formData.materiaalgroep}
              onChange={(e) => setFormData({
                ...formData,
                materiaalgroep: e.target.value,
                specificatie: null,
                oppervlaktebewerking: ''
              })}
              placeholder="Bijv. S235, RVS, Aluminium"
              required
            />
          </div>

          {/* Specificatie (always visible, optional) */}
          <div>
            <Label htmlFor="specificatie">Specificatie (optioneel)</Label>
            <Input
              id="specificatie"
              value={formData.specificatie || ''}
              onChange={(e) => setFormData({
                ...formData,
                specificatie: e.target.value || null
              })}
              placeholder="Bijv. 304, 316, 5083"
            />
          </div>

          {/* Oppervlaktebewerking */}
          <div>
            <Label htmlFor="oppervlaktebewerking">Oppervlaktebewerking *</Label>
            <Input
              id="oppervlaktebewerking"
              value={formData.oppervlaktebewerking}
              onChange={(e) => setFormData({
                ...formData,
                oppervlaktebewerking: e.target.value
              })}
              placeholder="Bijv. zwart, gestraald, geslepen"
              required
            />
          </div>

          {/* Plaatcode Prefix */}
          <div>
            <Label htmlFor="plaatcode_prefix">Plaatcode Prefix *</Label>
            <Input
              id="plaatcode_prefix"
              value={formData.plaatcode_prefix}
              onChange={(e) => {
                const value = e.target.value.toUpperCase()
                setFormData({...formData, plaatcode_prefix: value})
                setPrefixError('')
              }}
              placeholder="S235GE"
              maxLength={10}
              pattern="[A-Z0-9]+"
              disabled={isEditMode}
              className={isEditMode ? 'bg-gray-100 cursor-not-allowed' : ''}
            />
            {isEditMode && material && material.plate_count! > 0 && (
              <p className="text-sm text-amber-600 mt-1">
                Prefix kan niet worden gewijzigd: {material.plate_count} platen gebruiken dit materiaal
              </p>
            )}
            {!isEditMode && formData.plaatcode_prefix && (
              <p className="text-sm text-gray-500 mt-1">
                Eerste plaat krijgt: <span className="font-mono">{formData.plaatcode_prefix}-001</span>
              </p>
            )}
            {prefixError && (
              <p className="text-sm text-red-500 mt-1">{prefixError}</p>
            )}
          </div>

          {/* Kleur */}
          <div>
            <Label htmlFor="kleur">Kleur (voor UI) *</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={formData.kleur}
                onChange={(e) => setFormData({...formData, kleur: e.target.value})}
                className="w-20 h-10"
              />
              <Input
                type="text"
                value={formData.kleur}
                onChange={(e) => setFormData({...formData, kleur: e.target.value})}
                placeholder="#9CA3AF"
                className="flex-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuleren
            </Button>
            <Button
              type="submit"
              disabled={
                !!prefixError ||
                !formData.materiaalgroep ||
                !formData.oppervlaktebewerking ||
                !formData.plaatcode_prefix ||
                createMaterial.isPending ||
                updateMaterial.isPending
              }
            >
              {isEditMode
                ? (updateMaterial.isPending ? 'Opslaan...' : 'Materiaal Bijwerken')
                : (createMaterial.isPending ? 'Opslaan...' : 'Materiaal Toevoegen')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
