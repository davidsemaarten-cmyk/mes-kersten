/**
 * QuickClaimButton Component
 * Phase 7: Inline button for quick claiming plates
 *
 * Quick action button in Voorraad table to claim plates with minimal clicks
 */

import { useState } from 'react'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { Label } from './ui/label'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Folder } from 'lucide-react'
import { useCreateClaim } from '../hooks/usePlateStock'
import { useProject } from '../hooks/useProjects'
import { ProjectPhaseCombobox } from './ProjectPhaseCombobox'
import { FaseCombobox } from './FaseCombobox'
import type { PlateWithRelations } from '../types/database'

interface QuickClaimButtonProps {
  plate: PlateWithRelations
}

export function QuickClaimButton({ plate }: QuickClaimButtonProps) {
  const [open, setOpen] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [projectFase, setProjectFase] = useState('')
  const [m2Geclaimd, setM2Geclaimd] = useState('')
  const [claimNotes, setClaimNotes] = useState('')

  const createClaim = useCreateClaim()
  const { data: selectedProject } = useProject(selectedProjectId)

  // Check if plate is fully claimed (consumed or all area claimed)
  const isFullyClaimed = plate.is_consumed

  // Don't show button if plate is fully claimed
  if (isFullyClaimed) {
    return null
  }

  const calculateArea = () => {
    return ((plate.width * plate.length) / 1_000_000).toFixed(2)
  }

  const handleOpenDialog = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent row click event
    setOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedProject) {
      return
    }

    try {
      await createClaim.mutateAsync({
        plate_id: plate.id,
        project_naam: selectedProject.code,
        project_fase: projectFase,
        m2_geclaimd: m2Geclaimd ? parseFloat(m2Geclaimd) : undefined,
        notes: claimNotes || undefined
      })

      // Reset form and close
      setSelectedProjectId('')
      setProjectFase('')
      setM2Geclaimd('')
      setClaimNotes('')
      setOpen(false)
    } catch (error) {
      // Error handled by mutation
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpenDialog}
        className="text-blue-600 border-blue-200 hover:bg-blue-50"
      >
        <Folder className="h-3 w-3 mr-1" />
        Claim
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Plaat Claimen</DialogTitle>
            <DialogDescription>
              Claim {plate.plate_number} voor een project
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Project *</Label>
              <ProjectPhaseCombobox
                value={selectedProjectId}
                onValueChange={setSelectedProjectId}
                placeholder="Selecteer project..."
              />
            </div>

            <div className="space-y-2">
              <Label>Fase *</Label>
              <FaseCombobox
                projectId={selectedProjectId}
                value={projectFase}
                onValueChange={setProjectFase}
                placeholder="Selecteer fase..."
                disabled={!selectedProjectId}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="m2_geclaimd">M² Geclaimd</Label>
              <Input
                id="m2_geclaimd"
                type="number"
                step="0.01"
                placeholder={`Max ${calculateArea()} m²`}
                value={m2Geclaimd}
                onChange={(e) => setM2Geclaimd(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="claim_notes">Notities</Label>
              <Textarea
                id="claim_notes"
                value={claimNotes}
                onChange={(e) => setClaimNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Annuleren
              </Button>
              <Button
                type="submit"
                disabled={createClaim.isPending || !selectedProjectId || !projectFase}
              >
                {createClaim.isPending ? 'Claimen...' : 'Claim Toevoegen'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
