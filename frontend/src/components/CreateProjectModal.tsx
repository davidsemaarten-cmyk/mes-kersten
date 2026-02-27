/**
 * CreateProjectModal Component
 * Phase 1.1: Projects and Fases
 *
 * Modal for creating a new project
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { useCreateProject, type ProjectCreate } from '../hooks/useProjects'

interface CreateProjectModalProps {
  open: boolean
  onClose: () => void
}

export function CreateProjectModal({ open, onClose }: CreateProjectModalProps) {
  const navigate = useNavigate()
  const createProject = useCreateProject()

  const [formData, setFormData] = useState<ProjectCreate>({
    code: '',
    naam: '',
    beschrijving: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.code.trim()) {
      return
    }
    if (!formData.naam.trim()) {
      return
    }

    try {
      const project = await createProject.mutateAsync({
        code: formData.code.trim().toUpperCase(),
        naam: formData.naam.trim(),
        beschrijving: formData.beschrijving?.trim() || undefined,
      })

      // Close modal
      onClose()

      // Reset form
      setFormData({ code: '', naam: '', beschrijving: '' })

      // Navigate to project detail page
      navigate(`/projecten/${project.id}`)
    } catch (error) {
      // Error handled by mutation
    }
  }

  const handleClose = () => {
    if (!createProject.isPending) {
      setFormData({ code: '', naam: '', beschrijving: '' })
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nieuw Project</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">
              Projectcode <span className="text-red-500">*</span>
            </Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="bijv. STAGR"
              maxLength={10}
              required
              disabled={createProject.isPending}
              className="font-mono"
            />
            <p className="text-sm text-muted-foreground">
              Max 10 tekens, alleen hoofdletters, cijfers en koppeltekens
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="naam">
              Projectnaam <span className="text-red-500">*</span>
            </Label>
            <Input
              id="naam"
              value={formData.naam}
              onChange={(e) => setFormData({ ...formData, naam: e.target.value })}
              placeholder="bijv. Station Groningen"
              maxLength={500}
              required
              disabled={createProject.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="beschrijving">Beschrijving</Label>
            <Textarea
              id="beschrijving"
              value={formData.beschrijving}
              onChange={(e) => setFormData({ ...formData, beschrijving: e.target.value })}
              placeholder="Optionele projectbeschrijving..."
              rows={4}
              maxLength={5000}
              disabled={createProject.isPending}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createProject.isPending}
            >
              Annuleren
            </Button>
            <Button type="submit" disabled={createProject.isPending}>
              {createProject.isPending ? 'Aanmaken...' : 'Project Aanmaken'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
