/**
 * PlateDetailsModal component
 * Modal for viewing and editing a single plate with tabs
 */

import { useState } from 'react'
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
  useMoveToLaser,
  useMoveFromLaser,
  useConsumePlate,
  useCreateClaim,
  useReleaseClaim
} from '../hooks/usePlateStock'
import type { PlateWithRelations } from '../types/database'
import { Package, Zap, ArrowLeft, Trash2, Plus, X } from 'lucide-react'
import { toast } from 'sonner'

interface PlateDetailsModalProps {
  open: boolean
  onClose: () => void
  plate: PlateWithRelations | null
}

export function PlateDetailsModal({ open, onClose, plate }: PlateDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [showClaimForm, setShowClaimForm] = useState(false)

  // Form state for editing
  const [quality, setQuality] = useState('')
  const [thickness, setThickness] = useState('')
  const [width, setWidth] = useState('')
  const [length, setLength] = useState('')
  const [weight, setWeight] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')

  // Claim form state
  const [projectNaam, setProjectNaam] = useState('')
  const [projectFase, setProjectFase] = useState('')
  const [m2Geclaimd, setM2Geclaimd] = useState('')
  const [claimNotes, setClaimNotes] = useState('')

  // Mutations
  const updatePlate = useUpdatePlate()
  const moveToLaser = useMoveToLaser()
  const moveFromLaser = useMoveFromLaser()
  const consumePlate = useConsumePlate()
  const createClaim = useCreateClaim()
  const releaseClaim = useReleaseClaim()

  // Initialize form when plate changes
  useState(() => {
    if (plate) {
      setQuality(plate.quality)
      setThickness(plate.thickness.toString())
      setWidth(plate.width.toString())
      setLength(plate.length.toString())
      setWeight(plate.weight?.toString() || '')
      setLocation(plate.location || '')
      setNotes(plate.notes || '')
    }
  })

  if (!plate) return null

  const calculateArea = () => {
    return ((plate.width * plate.length) / 1_000_000).toFixed(2)
  }

  const handleSave = async () => {
    try {
      await updatePlate.mutateAsync({
        id: plate.id,
        data: {
          quality,
          thickness: parseFloat(thickness),
          width: parseInt(width),
          length: parseInt(length),
          weight: weight ? parseFloat(weight) : undefined,
          location: location || undefined,
          notes: notes || undefined
        }
      })
      setIsEditing(false)
    } catch (error) {
      // Error handled by mutation
    }
  }

  const handleNaarLaser = async () => {
    if (confirm('Deze plaat naar laser verplaatsen?')) {
      try {
        await moveToLaser.mutateAsync(plate.id)
        onClose()
      } catch (error) {
        // Error handled by mutation
      }
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

    try {
      await createClaim.mutateAsync({
        plate_id: plate.id,
        project_naam: projectNaam,
        project_fase: projectFase,
        m2_geclaimd: m2Geclaimd ? parseFloat(m2Geclaimd) : undefined,
        notes: claimNotes || undefined
      })

      // Reset form
      setProjectNaam('')
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div
              className="w-1 h-8 rounded"
              style={{ backgroundColor: plate.material?.kleur || '#gray' }}
            />
            {plate.plate_number}
            <Badge variant={plate.status === 'beschikbaar' ? 'default' : plate.status === 'geclaimd' ? 'secondary' : 'destructive'}>
              {plate.status === 'beschikbaar' ? 'Beschikbaar' : plate.status === 'geclaimd' ? 'Geclaimd' : 'Bij Laser'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="informatie" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="informatie">Informatie</TabsTrigger>
            <TabsTrigger value="claims">
              Claims {activeClaims.length > 0 && `(${activeClaims.length})`}
            </TabsTrigger>
            <TabsTrigger value="geschiedenis">Geschiedenis</TabsTrigger>
          </TabsList>

          {/* INFORMATIE TAB */}
          <TabsContent value="informatie" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Material Info (Read-only) */}
              <div className="space-y-2">
                <Label>Materiaal</Label>
                <Input value={plate.material?.naam || plate.material_prefix} disabled />
              </div>

              <div className="space-y-2">
                <Label>Plaatnummer</Label>
                <Input value={plate.plate_number} disabled />
              </div>

              {/* Editable Fields */}
              <div className="space-y-2">
                <Label htmlFor="quality">Kwaliteit</Label>
                <Input
                  id="quality"
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                  disabled={!isEditing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="thickness">Dikte (mm)</Label>
                <Input
                  id="thickness"
                  type="number"
                  step="0.1"
                  value={thickness}
                  onChange={(e) => setThickness(e.target.value)}
                  disabled={!isEditing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="width">Breedte (mm)</Label>
                <Input
                  id="width"
                  type="number"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  disabled={!isEditing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="length">Lengte (mm)</Label>
                <Input
                  id="length"
                  type="number"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  disabled={!isEditing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight">Gewicht (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.01"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Optioneel"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Locatie</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={!isEditing || plate.status === 'bij_laser'}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notities</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={!isEditing}
                rows={3}
              />
            </div>

            {/* Calculated Info */}
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Oppervlakte</p>
                    <p className="font-semibold">{calculateArea()} m²</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Aangemaakt door</p>
                    <p className="font-semibold">{plate.creator?.full_name || 'Onbekend'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Aangemaakt op</p>
                    <p className="font-semibold">
                      {new Date(plate.created_at).toLocaleDateString('nl-NL')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-between pt-4">
              <div className="flex gap-2">
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)}>Bewerken</Button>
                ) : (
                  <>
                    <Button onClick={handleSave} disabled={updatePlate.isPending}>
                      {updatePlate.isPending ? 'Opslaan...' : 'Opslaan'}
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Annuleren
                    </Button>
                  </>
                )}
              </div>

              <div className="flex gap-2">
                {plate.status !== 'bij_laser' ? (
                  <Button
                    variant="outline"
                    onClick={handleNaarLaser}
                    disabled={moveToLaser.isPending || plate.is_consumed}
                  >
                    <Zap className="h-4 w-4 mr-1" />
                    Naar Laser
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={handleVanLaser}
                    disabled={moveFromLaser.isPending}
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Van Laser
                  </Button>
                )}

                <Button
                  variant="destructive"
                  onClick={handleConsume}
                  disabled={consumePlate.isPending || plate.is_consumed}
                >
                  <Package className="h-4 w-4 mr-1" />
                  Consumeren
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* CLAIMS TAB */}
          <TabsContent value="claims" className="space-y-4">
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
                    <div className="grid grid-cols-2 gap-4">
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
          <TabsContent value="geschiedenis" className="space-y-4">
            <div className="text-center text-muted-foreground py-8">
              <p>Audit trail komt binnenkort beschikbaar</p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
