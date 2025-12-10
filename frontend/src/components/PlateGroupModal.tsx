/**
 * PlateGroupModal component
 * Modal for viewing a group of identical plates
 */

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Card, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { PlateDetailsModal } from './PlateDetailsModal'
import type { PlateWithRelations } from '../types/database'
import { Package } from 'lucide-react'

interface PlateGroupModalProps {
  open: boolean
  onClose: () => void
  plates: PlateWithRelations[]
}

export function PlateGroupModal({ open, onClose, plates }: PlateGroupModalProps) {
  const [selectedPlate, setSelectedPlate] = useState<PlateWithRelations | null>(null)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)

  if (!plates || plates.length === 0) return null

  // Use first plate as representative for shared properties
  const representative = plates[0]

  const calculateTotalArea = () => {
    return plates
      .reduce((total, plate) => {
        return total + ((plate.width * plate.length) / 1_000_000)
      }, 0)
      .toFixed(2)
  }

  const calculatePlateArea = (plate: PlateWithRelations) => {
    return ((plate.width * plate.length) / 1_000_000).toFixed(2)
  }

  const getFirstAndLastNumber = () => {
    const sorted = [...plates].sort((a, b) => a.plate_number.localeCompare(b.plate_number))
    return {
      first: sorted[0].plate_number,
      last: sorted[sorted.length - 1].plate_number
    }
  }

  const { first, last } = getFirstAndLastNumber()

  const handlePlateClick = (plate: PlateWithRelations) => {
    setSelectedPlate(plate)
    setDetailsModalOpen(true)
  }

  const handleDetailsModalClose = () => {
    setDetailsModalOpen(false)
    setSelectedPlate(null)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div
                className="w-1 h-8 rounded"
                style={{ backgroundColor: representative.material?.kleur || '#gray' }}
              />
              Groep Platen: {first} - {last}
            </DialogTitle>
          </DialogHeader>

          {/* Group Summary */}
          <Card className="bg-muted">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Aantal Platen</p>
                  <p className="text-2xl font-bold">{plates.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Totaal Oppervlak</p>
                  <p className="text-2xl font-bold">{calculateTotalArea()} m²</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Materiaal</p>
                  <p className="font-semibold">{representative.material?.naam || representative.material_prefix}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Locatie</p>
                  <p className="font-semibold">{representative.location || 'Geen locatie'}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Kwaliteit</p>
                  <p className="font-semibold">{representative.quality}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Dikte</p>
                  <p className="font-semibold">{representative.thickness} mm</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Afmetingen</p>
                  <p className="font-semibold">{representative.width} × {representative.length} mm</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Individual Plates List */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Individuele Platen ({plates.length})</h3>
            <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
              {plates.map((plate) => (
                <Card
                  key={plate.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  style={{
                    borderLeft: `4px solid ${plate.material?.kleur || '#gray'}`
                  }}
                  onClick={() => handlePlateClick(plate)}
                >
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Package className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-semibold">{plate.plate_number}</p>
                          <p className="text-sm text-muted-foreground">
                            {calculatePlateArea(plate)} m²
                            {plate.weight && ` • ${plate.weight} kg`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            plate.status === 'beschikbaar'
                              ? 'default'
                              : plate.status === 'geclaimd'
                              ? 'secondary'
                              : 'destructive'
                          }
                        >
                          {plate.status === 'beschikbaar'
                            ? 'Beschikbaar'
                            : plate.status === 'geclaimd'
                            ? 'Geclaimd'
                            : 'Bij Laser'}
                        </Badge>

                        {plate.claims.filter(c => c.actief).length > 0 && (
                          <Badge variant="outline">
                            {plate.claims.filter(c => c.actief).length} claim
                            {plate.claims.filter(c => c.actief).length > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {plate.notes && (
                      <p className="text-sm text-muted-foreground mt-2 ml-8">
                        {plate.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Plate Details Modal */}
      <PlateDetailsModal
        open={detailsModalOpen}
        onClose={handleDetailsModalClose}
        plate={selectedPlate}
      />
    </>
  )
}
