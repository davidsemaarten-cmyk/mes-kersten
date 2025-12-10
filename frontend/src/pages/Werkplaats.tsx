/**
 * Werkplaats (Workshop) Page
 * Tablet-optimized view for workshop floor
 */

import { useState, useMemo } from 'react'
import Layout from '../components/Layout'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { PlateDetailsModal } from '../components/PlateDetailsModal'
import { usePlates } from '../hooks/usePlateStock'
import type { PlateWithRelations } from '../types/database'
import { Loader2, Package } from 'lucide-react'

export function Werkplaats() {
  const [selectedPlate, setSelectedPlate] = useState<PlateWithRelations | null>(null)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)

  // Filters
  const [materialFilter, setMaterialFilter] = useState<string>('all')
  const [locationFilter, setLocationFilter] = useState<string>('all')
  const [thicknessFilter, setThicknessFilter] = useState<string>('all')
  const [claimedFirst, setClaimedFirst] = useState(true)

  const { data: plates, isLoading } = usePlates({ include_consumed: false })

  // Get unique filter options
  const materials = useMemo(() => {
    if (!plates) return []
    const unique = Array.from(new Set(plates.map(p => p.material_prefix)))
    return unique.sort()
  }, [plates])

  const locations = useMemo(() => {
    if (!plates) return []
    const unique = Array.from(new Set(plates.map(p => p.location || 'Geen locatie')))
    return unique.sort()
  }, [plates])

  const thicknesses = useMemo(() => {
    if (!plates) return []
    const unique = Array.from(new Set(plates.map(p => p.thickness.toString())))
    return unique.sort((a, b) => parseFloat(a) - parseFloat(b))
  }, [plates])

  // Filter and sort plates
  const displayPlates = useMemo(() => {
    if (!plates) return []

    let filtered = plates

    // Apply filters
    if (materialFilter !== 'all') {
      filtered = filtered.filter(p => p.material_prefix === materialFilter)
    }
    if (locationFilter !== 'all') {
      filtered = filtered.filter(p => (p.location || 'Geen locatie') === locationFilter)
    }
    if (thicknessFilter !== 'all') {
      filtered = filtered.filter(p => p.thickness.toString() === thicknessFilter)
    }

    // Sort: claimed first if enabled
    if (claimedFirst) {
      filtered = [...filtered].sort((a, b) => {
        if (a.status === 'geclaimd' && b.status !== 'geclaimd') return -1
        if (a.status !== 'geclaimd' && b.status === 'geclaimd') return 1
        return a.plate_number.localeCompare(b.plate_number)
      })
    }

    return filtered
  }, [plates, materialFilter, locationFilter, thicknessFilter, claimedFirst])

  const handlePlateClick = (plate: PlateWithRelations) => {
    setSelectedPlate(plate)
    setDetailsModalOpen(true)
  }

  const calculateArea = (plate: PlateWithRelations) => {
    return ((plate.width * plate.length) / 1_000_000).toFixed(2)
  }

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header - Larger for tablet */}
        <div>
        <h1 className="text-4xl font-bold">Werkplaats</h1>
        <p className="text-xl text-muted-foreground mt-2">
          {plates ? `${displayPlates.length} platen beschikbaar` : 'Laden...'}
        </p>
      </div>

      {/* Filters - Large touch targets */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-lg font-medium">Materiaal</label>
              <Select value={materialFilter} onValueChange={setMaterialFilter}>
                <SelectTrigger className="h-14 text-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-lg">Alle materialen</SelectItem>
                  {materials.map(material => (
                    <SelectItem key={material} value={material} className="text-lg">
                      {material}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-lg font-medium">Locatie</label>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="h-14 text-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-lg">Alle locaties</SelectItem>
                  {locations.map(location => (
                    <SelectItem key={location} value={location} className="text-lg">
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-lg font-medium">Dikte</label>
              <Select value={thicknessFilter} onValueChange={setThicknessFilter}>
                <SelectTrigger className="h-14 text-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-lg">Alle diktes</SelectItem>
                  {thicknesses.map(thickness => (
                    <SelectItem key={thickness} value={thickness} className="text-lg">
                      {thickness} mm
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-lg font-medium">Sortering</label>
              <Button
                variant={claimedFirst ? 'default' : 'outline'}
                className="h-14 w-full text-lg"
                onClick={() => setClaimedFirst(!claimedFirst)}
              >
                {claimedFirst ? 'Geclaimd eerst' : 'Alfabetisch'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
          <p className="text-xl text-muted-foreground">Platen laden...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && displayPlates.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-2xl font-semibold mb-2">Geen platen gevonden</h3>
            <p className="text-xl text-muted-foreground">
              Probeer andere filters
            </p>
          </CardContent>
        </Card>
      )}

      {/* Plates Grid - Large cards for tablet */}
      {!isLoading && displayPlates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayPlates.map(plate => (
            <Card
              key={plate.id}
              className="cursor-pointer hover:shadow-lg transition-shadow min-h-[120px]"
              style={{
                borderLeft: `6px solid ${plate.material?.kleur || '#gray'}`
              }}
              onClick={() => handlePlateClick(plate)}
            >
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {/* Header with status */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-2xl font-bold">{plate.plate_number}</p>
                      <p className="text-lg text-muted-foreground mt-1">
                        {plate.material?.naam || plate.material_prefix}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Badge
                        className="text-base px-3 py-1"
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
                        <Badge variant="outline" className="text-base px-3 py-1">
                          {plate.claims.filter(c => c.actief).length} claim
                          {plate.claims.filter(c => c.actief).length > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-3 text-base">
                    <div>
                      <p className="text-muted-foreground">Kwaliteit</p>
                      <p className="font-semibold text-lg">{plate.quality}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Dikte</p>
                      <p className="font-semibold text-lg">{plate.thickness} mm</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Afmetingen</p>
                      <p className="font-semibold text-lg">
                        {plate.width} × {plate.length} mm
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Oppervlak</p>
                      <p className="font-semibold text-lg">{calculateArea(plate)} m²</p>
                    </div>
                  </div>

                  {/* Location */}
                  {plate.location && (
                    <div className="pt-3 border-t">
                      <p className="text-muted-foreground">Locatie</p>
                      <p className="font-semibold text-lg">{plate.location}</p>
                    </div>
                  )}

                  {/* Claims info */}
                  {plate.claims.filter(c => c.actief).length > 0 && (
                    <div className="pt-3 border-t">
                      <p className="text-muted-foreground mb-2">Geclaimd voor:</p>
                      <div className="flex flex-wrap gap-2">
                        {plate.claims
                          .filter(c => c.actief)
                          .map(claim => (
                            <Badge key={claim.id} variant="outline" className="text-base">
                              {claim.project_naam} - {claim.project_fase}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Plate Details Modal */}
      <PlateDetailsModal
        open={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false)
          setSelectedPlate(null)
        }}
        plate={selectedPlate}
      />
      </div>
    </Layout>
  )
}
