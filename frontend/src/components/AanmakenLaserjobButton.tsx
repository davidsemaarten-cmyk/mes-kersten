/**
 * AanmakenLaserjobButton — Button to create a laser job from fase posnummers
 *
 * Finds all plaat-posnummers (profiel starts with "PL") and creates a new
 * laser job with manual line items for each one, linked to the fase.
 */

import { useState } from 'react'
import { Button } from './ui/button'
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, DialogFooter,
} from './ui/dialog'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Badge } from './ui/badge'
import { Layers, Loader2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { toast } from 'sonner'
import type { Posnummer } from '../types/database'

interface AanmakenLaserjobButtonProps {
  faseId: string
  projectId: string
  posnummers: Posnummer[]
}

function isPlaaPosnummer(p: Posnummer): boolean {
  // profiel starts with "PL" (case-insensitive)
  return !!(p.profiel && /^PL\d*/i.test(p.profiel.trim()))
}

export function AanmakenLaserjobButton({
  faseId,
  projectId,
  posnummers,
}: AanmakenLaserjobButtonProps) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [jobName, setJobName] = useState('')
  const [loading, setLoading] = useState(false)

  const plaatPosnummers = posnummers.filter(isPlaaPosnummer)

  const handleCreate = async () => {
    if (!jobName.trim()) return
    setLoading(true)

    try {
      // Step 1: Create laser job linked to fase
      const jobResponse = await api.post('/api/laserplanner/jobs', {
        naam: jobName.trim(),
        project_id: projectId,
        fase_id: faseId,
      })
      const job = jobResponse.data

      // Step 2: Add manual line items for each plaat-posnummer
      let created = 0
      for (const p of plaatPosnummers) {
        try {
          await api.post(`/api/laserplanner/jobs/${job.id}/line-items/manual`, {
            posnr: p.posnr,
            profiel: p.profiel,
            kwaliteit: p.materiaal,
            aantal: p.quantity,
          })
          created++
        } catch {
          // continue with others if one fails
        }
      }

      queryClient.invalidateQueries({ queryKey: ['laser-jobs-by-fase', faseId] })
      queryClient.invalidateQueries({ queryKey: ['laser-jobs'] })

      toast.success(
        `Laserjob "${job.naam}" aangemaakt met ${created} plaatposnummers`
      )
      setOpen(false)
      setJobName('')
    } catch (error: any) {
      const message = error?.response?.data?.detail || 'Fout bij aanmaken laserjob'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        title="Maak een laserjob aan op basis van de plaatposnummers in deze fase"
      >
        <Layers className="h-4 w-4 mr-2" />
        Laserjob aanmaken
        {plaatPosnummers.length > 0 && (
          <Badge variant="secondary" className="ml-2 text-xs">
            {plaatPosnummers.length} platen
          </Badge>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Laserjob aanmaken</DialogTitle>
            <DialogDescription>
              Er worden {plaatPosnummers.length} plaatposnummers (profiel = PL...) gekopieerd naar de nieuwe laserjob.
            </DialogDescription>
          </DialogHeader>

          {plaatPosnummers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Geen plaatposnummers gevonden (posnummers met profiel "PL...").
            </p>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="jobName">Naam laserjob *</Label>
                <Input
                  id="jobName"
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                  placeholder="Bijv. GENDT-001 Platen"
                  autoFocus
                />
              </div>

              <div className="rounded-md border p-3 bg-muted/50">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Te kopiëren plaatposnummers ({plaatPosnummers.length}):
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                  {plaatPosnummers.map((p) => (
                    <Badge key={p.id} variant="outline" className="text-xs font-mono">
                      {p.posnr} — {p.profiel} ×{p.quantity}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuleren
            </Button>
            <Button
              onClick={handleCreate}
              disabled={loading || !jobName.trim() || plaatPosnummers.length === 0}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Aanmaken
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
