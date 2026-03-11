import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { ProjectPhaseCombobox } from './ProjectPhaseCombobox'
import { FaseCombobox } from './FaseCombobox'
import { useCreateLaserJob } from '../hooks/useLaserplanner'

interface CreateJobModalProps {
  open: boolean
  onClose: () => void
}

export function CreateJobModal({ open, onClose }: CreateJobModalProps) {
  const createJob = useCreateLaserJob()
  const [formData, setFormData] = useState({
    naam: '',
    beschrijving: '',
    project_id: '',
    fase_id: ''
  })

  // Reset fase when project changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, fase_id: '' }))
  }, [formData.project_id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    await createJob.mutateAsync({
      naam: formData.naam,
      beschrijving: formData.beschrijving || undefined,
      project_id: formData.project_id,
      fase_id: formData.fase_id
    })
    setFormData({ naam: '', beschrijving: '', project_id: '', fase_id: '' })
    onClose()
  }

  const isFormValid = formData.naam.trim() && formData.project_id && formData.fase_id

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nieuwe Laserjob</DialogTitle>
          <DialogDescription>
            Maak een nieuwe laserjob aan
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label>Project *</Label>
            <ProjectPhaseCombobox
              value={formData.project_id}
              onValueChange={(value) => setFormData({ ...formData, project_id: value })}
              placeholder="Selecteer project..."
            />
          </div>

          <div className="space-y-2">
            <Label>Fase *</Label>
            <FaseCombobox
              projectId={formData.project_id || null}
              value={formData.fase_id}
              onValueChange={(value) => setFormData({ ...formData, fase_id: value })}
              placeholder="Selecteer fase..."
            />
            {!formData.project_id && (
              <p className="text-xs text-muted-foreground">
                Selecteer eerst een project
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="naam">Naam *</Label>
            <Input
              id="naam"
              value={formData.naam}
              onChange={(e) => setFormData({ ...formData, naam: e.target.value })}
              required
              placeholder="Bijv. GENDT Hekken"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="beschrijving">Beschrijving</Label>
            <Textarea
              id="beschrijving"
              value={formData.beschrijving}
              onChange={(e) => setFormData({ ...formData, beschrijving: e.target.value })}
              placeholder="Optionele beschrijving..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuleren
            </Button>
            <Button type="submit" disabled={createJob.isPending || !isFormValid}>
              Aanmaken
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
