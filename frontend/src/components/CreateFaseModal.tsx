/**
 * CreateFaseModal Component
 * Phase 1.1: Projects and Fases
 *
 * Modal for creating a new fase within a project
 */

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { useCreateFase, type FaseCreate } from '../hooks/useProjects'

interface CreateFaseModalProps {
  open: boolean
  onClose: () => void
  projectId: string
}

export function CreateFaseModal({ open, onClose, projectId }: CreateFaseModalProps) {
  const createFase = useCreateFase(projectId)

  const [formData, setFormData] = useState({
    fase_nummer: '',
    beschrijving: '',
    opmerkingen_intern: '',
    opmerkingen_werkplaats: '',
    montage_datum: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.fase_nummer.trim()) {
      return
    }

    // Ensure fase_nummer is exactly 3 digits
    const faseNummer = formData.fase_nummer.trim().padStart(3, '0')

    if (!/^\d{3}$/.test(faseNummer)) {
      return
    }

    try {
      const faseData: FaseCreate = {
        project_id: projectId,
        fase_nummer: faseNummer,
        beschrijving: formData.beschrijving?.trim() || undefined,
        opmerkingen_intern: formData.opmerkingen_intern?.trim() || undefined,
        opmerkingen_werkplaats: formData.opmerkingen_werkplaats?.trim() || undefined,
        montage_datum: formData.montage_datum || undefined,
      }

      await createFase.mutateAsync(faseData)

      // Close modal and reset form
      onClose()
      setFormData({
        fase_nummer: '',
        beschrijving: '',
        opmerkingen_intern: '',
        opmerkingen_werkplaats: '',
        montage_datum: '',
      })
    } catch (error) {
      // Error handled by mutation
    }
  }

  const handleClose = () => {
    if (!createFase.isPending) {
      setFormData({
        fase_nummer: '',
        beschrijving: '',
        opmerkingen_intern: '',
        opmerkingen_werkplaats: '',
        montage_datum: '',
      })
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Nieuwe Fase</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fase_nummer">
                Fasenummer <span className="text-red-500">*</span>
              </Label>
              <Input
                id="fase_nummer"
                value={formData.fase_nummer}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 3)
                  setFormData({ ...formData, fase_nummer: value })
                }}
                placeholder="bijv. 001"
                maxLength={3}
                required
                disabled={createFase.isPending}
                className="font-mono"
              />
              <p className="text-sm text-muted-foreground">Exacte 3 cijfers</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="montage_datum">Montage Datum</Label>
              <Input
                id="montage_datum"
                type="date"
                value={formData.montage_datum}
                onChange={(e) => setFormData({ ...formData, montage_datum: e.target.value })}
                disabled={createFase.isPending}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="beschrijving">Beschrijving</Label>
            <Input
              id="beschrijving"
              value={formData.beschrijving}
              onChange={(e) => setFormData({ ...formData, beschrijving: e.target.value })}
              placeholder="bijv. hekken"
              maxLength={500}
              disabled={createFase.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="opmerkingen_intern">Opmerkingen Intern</Label>
            <Textarea
              id="opmerkingen_intern"
              value={formData.opmerkingen_intern}
              onChange={(e) => setFormData({ ...formData, opmerkingen_intern: e.target.value })}
              placeholder="Interne notities (alleen zichtbaar voor werkvoorbereider)..."
              rows={3}
              maxLength={5000}
              disabled={createFase.isPending}
            />
            <p className="text-sm text-muted-foreground">
              Alleen zichtbaar voor werkvoorbereider
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="opmerkingen_werkplaats">Opmerkingen Werkplaats</Label>
            <Textarea
              id="opmerkingen_werkplaats"
              value={formData.opmerkingen_werkplaats}
              onChange={(e) =>
                setFormData({ ...formData, opmerkingen_werkplaats: e.target.value })
              }
              placeholder="Notities voor de werkplaats..."
              rows={3}
              maxLength={5000}
              disabled={createFase.isPending}
            />
            <p className="text-sm text-muted-foreground">Zichtbaar voor werkplaats</p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createFase.isPending}
            >
              Annuleren
            </Button>
            <Button type="submit" disabled={createFase.isPending}>
              {createFase.isPending ? 'Aanmaken...' : 'Fase Aanmaken'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
