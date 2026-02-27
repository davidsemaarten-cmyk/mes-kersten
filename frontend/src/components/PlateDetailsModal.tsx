/**
 * PlateDetailsModal component
 * Modal for viewing and editing a single plate with tabs
 */

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Badge } from './ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import {
  useUpdatePlate,
  useMoveFromLaser,
  useConsumePlate,
  useCreateClaim,
  useReleaseClaim
} from '../hooks/usePlateStock'
import { ProjectPhaseCombobox } from './ProjectPhaseCombobox'
import { FaseCombobox } from './FaseCombobox'
import { useProject } from '../hooks/useProjects'
import { useAuth } from '../hooks/useAuth'
import type { PlateWithRelations } from '../types/database'
import { Package, ArrowLeft, Trash2, Plus, X } from 'lucide-react'
import { toast } from 'sonner'

interface PlateDetailsModalProps {
  open: boolean
  onClose: () => void
  plate: PlateWithRelations | null
}

export function PlateDetailsModal({ open, onClose, plate }: PlateDetailsModalProps) {
  const [showClaimForm, setShowClaimForm] = useState(false)

  // Form state for notes (only editable field)
  const [notes, setNotes] = useState('')

  // Claim form state
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [projectFase, setProjectFase] = useState('')
  const [m2Geclaimd, setM2Geclaimd] = useState('')
  const [claimNotes, setClaimNotes] = useState('')

  // Get current user for role-based access
  const { user } = useAuth()

  // Fetch selected project details
  const { data: selectedProject } = useProject(selectedProjectId || undefined)

  // Mutations
  const updatePlate = useUpdatePlate()
  const moveFromLaser = useMoveFromLaser()
  const consumePlate = useConsumePlate()
  const createClaim = useCreateClaim()
  const releaseClaim = useReleaseClaim()

  // Initialize notes when plate changes
  useEffect(() => {
    if (plate) {
      setNotes(plate.notes || '')
    }
  }, [plate])

  if (!plate) return null

  const calculateArea = () => {
    return ((plate.width * plate.length) / 1_000_000).toFixed(2)
  }

  const handleSave = async () => {
    try {
      await updatePlate.mutateAsync({
        id: plate.id,
        data: {
          notes: notes || undefined
        }
      })
      toast.success('Notities opgeslagen')
    } catch (error) {
      // Error handled by mutation
    }
  }

  const handleVanLaser = async () => {
    const newLocation = prompt('Nieuwe locatie voor deze plaat:', plate.location || 'Lade 1')
    if (newLocation) {
      try {
        await moveFromLaser.mutateAsync({
          id: plate.id,
          data: { new_location: newLocation }
        })
        onClose()
      } catch (error) {
        // Error handled by mutation
      }
    }
  }

  const handleConsume = async () => {
    if (confirm(`Plaat ${plate.plate_number} consumeren? Dit kan niet ongedaan gemaakt worden en alle claims worden vrijgegeven.`)) {
      try {
        await consumePlate.mutateAsync(plate.id)
        onClose()
      } catch (error) {
        // Error handled by mutation
      }
    }
  }

  const handleCreateClaim = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedProject) {
      toast.error('Selecteer eerst een project')
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

      // Reset form
      setSelectedProjectId('')
      setProjectFase('')
      setM2Geclaimd('')
      setClaimNotes('')
      setShowClaimForm(false)
    } catch (error) {
      // Error handled by mutation
    }
  }

  const handleReleaseClaim = async (claimId: string) => {
    if (confirm('Deze claim vrijgeven?')) {
      try {
        await releaseClaim.mutateAsync(claimId)
      } catch (error) {
        // Error handled by mutation
      }
    }
  }

  const activeClaims = plate.claims.filter(c => c.actief)
  const releasedClaims = plate.claims.filter(c => !c.actief)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] p-0 gap-0 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <DialogHeader className="px-8 pt-8 pb-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-1 h-10 rounded-full"
                style={{ backgroundColor: plate.material?.kleur || '#6B7280' }}
              />
              <div>
                <DialogTitle className="text-xl font-semibold text-gray-900">
                  {plate.plate_number}
                </DialogTitle>
                <p className="text-sm text-gray-500 mt-1">
                  {plate.material?.naam || plate.material_prefix}
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={
                plate.status === 'beschikbaar'
                  ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-50'
                  : plate.status === 'geclaimd'
                  ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50'
                  : 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-50'
              }
            >
              {plate.status === 'beschikbaar' ? 'Beschikbaar' : plate.status === 'geclaimd' ? 'Geclaimd' : 'Bij Laser'}
            </Badge>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <Tabs defaultValue="informatie" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3 rounded-none border-b border-gray-200 bg-transparent h-12 px-8">
            <TabsTrigger
              value="informatie"
              className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none"
            >
              Informatie
            </TabsTrigger>
            <TabsTrigger
              value="claims"
              className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none"
            >
              Claims {activeClaims.length > 0 && `(${activeClaims.length})`}
            </TabsTrigger>
            <TabsTrigger
              value="geschiedenis"
              className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none"
            >
              Geschiedenis
            </TabsTrigger>
          </TabsList>

          {/* INFORMATIE TAB */}
          <TabsContent value="informatie" className="flex-1 overflow-y-auto px-8 py-6 space-y-4 m-0">
            {/* Specifications Section */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3 pb-2 border-b border-gray-200">
                Specificaties
              </h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">Materiaal</p>
                  <p className="text-sm font-medium text-gray-900">{plate.material?.naam || plate.material_prefix}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">Kwaliteit</p>
                  <p className="text-sm font-medium text-gray-900">{plate.quality}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">Plaatnummer</p>
                  <p className="font-mono text-sm font-medium text-gray-900">{plate.plate_number}</p>
                </div>
                {plate.material?.oppervlaktebewerking && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">Oppervlaktebewerking</p>
                    <p className="text-sm font-medium text-gray-900">{plate.material.oppervlaktebewerking}</p>
                  </div>
                )}
              </div>
            </section>

            {/* Dimensions Section */}
            <section className="pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3 pb-2 border-b border-gray-200">
                Afmetingen & Gewicht
              </h3>
              <div className="grid grid-cols-3 gap-x-6 gap-y-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">Breedte</p>
                  <p className="text-sm font-medium text-gray-900">{plate.width} mm</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">Lengte</p>
                  <p className="text-sm font-medium text-gray-900">{plate.length} mm</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">Dikte</p>
                  <p className="text-sm font-medium text-gray-900">{plate.thickness} mm</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">Oppervlakte</p>
                  <p className="text-sm font-semibold text-gray-900">{calculateArea()} m²</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">Gewicht</p>
                  <p className="text-sm font-medium text-gray-900">{plate.weight ? `${plate.weight} kg` : '-'}</p>
                </div>
              </div>
            </section>

            {/* Location Section */}
            <section className="pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3 pb-2 border-b border-gray-200">
                Locatie & Tracering
              </h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">Huidige locatie</p>
                  <p className="text-sm font-medium text-gray-900">{plate.location || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">Heatnummer</p>
                  <p className="font-mono text-sm font-medium text-gray-900">{plate.heatnummer || '-'}</p>
                </div>
              </div>
            </section>

            {/* Notes Section - EDITABLE */}
            <section className="pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3 pb-2 border-b border-gray-200">
                Notities
              </h3>
              <div className="space-y-2">
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="resize-none border-gray-200 focus:border-blue-400"
                  placeholder="Voeg notities toe..."
                />
                {notes !== (plate.notes || '') && (
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSave}
                      disabled={updatePlate.isPending}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {updatePlate.isPending ? 'Opslaan...' : 'Notities Opslaan'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNotes(plate.notes || '')}
                      className="border-gray-300 hover:bg-gray-50"
                    >
                      Annuleren
                    </Button>
                  </div>
                )}
              </div>
            </section>

            <div className="border-t border-gray-200" />

            {/* Metadata Section */}
            <section className="pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3 pb-2 border-b border-gray-200">
                Metadata
              </h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">Aangemaakt door</p>
                  <p className="text-sm font-medium text-gray-900">{plate.creator?.full_name || 'Onbekend'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">Aangemaakt op</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(plate.created_at).toLocaleDateString('nl-NL', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </section>

          </TabsContent>

          {/* CLAIMS TAB */}
          <TabsContent value="claims" className="flex-1 overflow-y-auto px-8 py-6 space-y-6 m-0">
            {/* Add Claim Button */}
            {!showClaimForm && (
              <Button onClick={() => setShowClaimForm(true)} className="w-full">
                <Plus className="h-4 w-4 mr-1" />
                Nieuwe Claim Toevoegen
              </Button>
            )}

            {/* Claim Form */}
            {showClaimForm && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Nieuwe Claim
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowClaimForm(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateClaim} className="space-y-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="project">Project *</Label>
                        <ProjectPhaseCombobox
                          value={selectedProjectId}
                          onValueChange={setSelectedProjectId}
                          placeholder="Selecteer project..."
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="project_fase">Fase *</Label>
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
                      </div>
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

                    <div className="flex gap-2">
                      <Button type="submit" disabled={createClaim.isPending}>
                        {createClaim.isPending ? 'Claimen...' : 'Claim Toevoegen'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowClaimForm(false)}
                      >
                        Annuleren
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Active Claims */}
            {activeClaims.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold">Actieve Claims ({activeClaims.length})</h4>
                {activeClaims.map((claim) => (
                  <Card key={claim.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge>{claim.project_naam} - {claim.project_fase}</Badge>
                            {claim.m2_geclaimd && (
                              <span className="text-sm text-muted-foreground">
                                {claim.m2_geclaimd} m²
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Geclaimd op {new Date(claim.claimed_at).toLocaleDateString('nl-NL')}
                          </p>
                          {claim.notes && (
                            <p className="text-sm">{claim.notes}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReleaseClaim(claim.id)}
                          disabled={releaseClaim.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Released Claims */}
            {releasedClaims.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-muted-foreground">
                  Vrijgegeven Claims ({releasedClaims.length})
                </h4>
                {releasedClaims.map((claim) => (
                  <Card key={claim.id} className="opacity-60">
                    <CardContent className="pt-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {claim.project_naam} - {claim.project_fase}
                          </Badge>
                          {claim.m2_geclaimd && (
                            <span className="text-sm text-muted-foreground">
                              {claim.m2_geclaimd} m²
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Geclaimd op {new Date(claim.claimed_at).toLocaleDateString('nl-NL')}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {activeClaims.length === 0 && releasedClaims.length === 0 && !showClaimForm && (
              <div className="text-center text-muted-foreground py-8">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Geen claims op deze plaat</p>
              </div>
            )}
          </TabsContent>

          {/* GESCHIEDENIS TAB */}
          <TabsContent value="geschiedenis" className="flex-1 overflow-y-auto px-8 py-6 m-0">
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Package className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1">Audit trail komt binnenkort</p>
              <p className="text-sm text-gray-500">De geschiedenis van deze plaat wordt hier weergegeven</p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
