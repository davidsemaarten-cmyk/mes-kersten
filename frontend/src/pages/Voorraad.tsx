/**
 * Voorraad (Inventory) Page
 * Main inventory view for admin and werkvoorbereiders
 */

import { useState, useMemo } from 'react'
import Layout from '../components/Layout'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { Checkbox } from '../components/ui/checkbox'
import { Label } from '../components/ui/label'
import { Card, CardContent } from '../components/ui/card'
import { AddPlatesModal } from '../components/AddPlatesModal'
import { BulkClaimModal } from '../components/BulkClaimModal'
import { PlateDetailsModal } from '../components/PlateDetailsModal'
import { PlateGroupModal } from '../components/PlateGroupModal'
import { PlateCard } from '../components/PlateCard'
import { usePlates } from '../hooks/usePlateStock'
import type { PlateWithRelations } from '../types/database'
import { Plus, Package, Loader2, Search } from 'lucide-react'

interface PlateGroup {
  type: 'group'
  plates: PlateWithRelations[]
  count: number
  first_number: string
  last_number: string
  // Shared properties
  material_prefix: string
  quality: string
  thickness: number
  width: number
  length: number
  location: string | null
  material?: PlateWithRelations['material']
}

interface SinglePlate {
  type: 'single'
  plate: PlateWithRelations
}

type PlateOrGroup = PlateGroup | SinglePlate

export function Voorraad() {
  const [searchQuery, setSearchQuery] = useState('')
  const [groupIdentical, setGroupIdentical] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [bulkClaimModalOpen, setBulkClaimModalOpen] = useState(false)
  const [selectedPlate, setSelectedPlate] = useState<PlateWithRelations | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<PlateWithRelations[] | null>(null)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [groupModalOpen, setGroupModalOpen] = useState(false)

  const { data: plates, isLoading } = usePlates({ include_consumed: false })

  // Filter plates based on search query
  const filteredPlates = useMemo(() => {
    if (!plates) return []

    if (!searchQuery) return plates

    const query = searchQuery.toLowerCase()
    return plates.filter(plate => {
      return (
        plate.plate_number.toLowerCase().includes(query) ||
        plate.material_prefix.toLowerCase().includes(query) ||
        plate.quality.toLowerCase().includes(query) ||
        plate.location?.toLowerCase().includes(query) ||
        plate.material?.naam.toLowerCase().includes(query)
      )
    })
  }, [plates, searchQuery])

  // Group plates if enabled
  const displayItems = useMemo((): PlateOrGroup[] => {
    if (!groupIdentical) {
      return filteredPlates.map(plate => ({
        type: 'single' as const,
        plate
      }))
    }

    // Group identical plates
    const groups = new Map<string, PlateWithRelations[]>()

    for (const plate of filteredPlates) {
      const key = `${plate.material_prefix}_${plate.quality}_${plate.thickness}_${plate.width}_${plate.length}_${plate.location || ''}`

      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(plate)
    }

    const result: PlateOrGroup[] = []

    for (const groupPlates of groups.values()) {
      if (groupPlates.length === 1) {
        result.push({
          type: 'single',
          plate: groupPlates[0]
        })
      } else {
        // Sort by plate number
        const sorted = [...groupPlates].sort((a, b) =>
          a.plate_number.localeCompare(b.plate_number)
        )
        result.push({
          type: 'group',
          plates: sorted,
          count: sorted.length,
          first_number: sorted[0].plate_number,
          last_number: sorted[sorted.length - 1].plate_number,
          material_prefix: sorted[0].material_prefix,
          quality: sorted[0].quality,
          thickness: sorted[0].thickness,
          width: sorted[0].width,
          length: sorted[0].length,
          location: sorted[0].location,
          material: sorted[0].material
        })
      }
    }

    return result
  }, [filteredPlates, groupIdentical])

  const handleItemClick = (item: PlateOrGroup) => {
    if (item.type === 'single') {
      setSelectedPlate(item.plate)
      setDetailsModalOpen(true)
    } else {
      setSelectedGroup(item.plates)
      setGroupModalOpen(true)
    }
  }

  const calculateTotalArea = (plates: PlateWithRelations[]) => {
    return plates
      .reduce((total, plate) => {
        return total + ((plate.width * plate.length) / 1_000_000)
      }, 0)
      .toFixed(2)
  }

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Voorraad</h1>
          <p className="text-muted-foreground">
            {plates ? `${plates.length} platen in voorraad` : 'Laden...'}
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => setBulkClaimModalOpen(true)} variant="outline">
            <Package className="h-4 w-4 mr-2" />
            Bulk Claim
          </Button>
          <Button onClick={() => setAddModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Platen Toevoegen
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Zoek op plaatnummer, materiaal, kwaliteit, locatie..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="group-identical"
                checked={groupIdentical}
                onCheckedChange={(checked) => setGroupIdentical(checked as boolean)}
              />
              <Label htmlFor="group-identical" className="cursor-pointer">
                Groepeer identieke platen
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Platen laden...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && displayItems.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Geen platen gevonden</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? 'Probeer een andere zoekopdracht'
                : 'Voeg platen toe om te beginnen'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setAddModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Eerste Plaat Toevoegen
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Plates Grid */}
      {!isLoading && displayItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayItems.map((item, index) => {
            if (item.type === 'single') {
              return (
                <PlateCard
                  key={item.plate.id}
                  plate={item.plate}
                  onClick={() => handleItemClick(item)}
                />
              )
            } else {
              // Group Card
              const totalArea = calculateTotalArea(item.plates)
              return (
                <Card
                  key={`group-${index}`}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  style={{
                    borderLeft: `4px solid ${item.material?.kleur || '#gray'}`
                  }}
                  onClick={() => handleItemClick(item)}
                >
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      {/* Group Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Groep Platen</p>
                          <p className="font-semibold">
                            {item.first_number} - {item.last_number}
                          </p>
                        </div>
                        <div className="bg-primary text-primary-foreground rounded-full px-3 py-1 text-sm font-semibold">
                          {item.count}×
                        </div>
                      </div>

                      {/* Material Info */}
                      <div className="space-y-1">
                        <p className="font-semibold text-lg">
                          {item.material?.naam || item.material_prefix}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {item.quality} • {item.thickness}mm
                        </p>
                      </div>

                      {/* Dimensions */}
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Afmetingen</p>
                          <p className="font-medium">
                            {item.width} × {item.length} mm
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Totaal Oppervlak</p>
                          <p className="font-medium">{totalArea} m²</p>
                        </div>
                      </div>

                      {/* Location */}
                      {item.location && (
                        <div className="pt-2 border-t">
                          <p className="text-sm text-muted-foreground">Locatie</p>
                          <p className="font-medium">{item.location}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            }
          })}
        </div>
      )}

      {/* Modals */}
      <AddPlatesModal open={addModalOpen} onClose={() => setAddModalOpen(false)} />
      <BulkClaimModal
        open={bulkClaimModalOpen}
        onClose={() => setBulkClaimModalOpen(false)}
      />
      <PlateDetailsModal
        open={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false)
          setSelectedPlate(null)
        }}
        plate={selectedPlate}
      />
      <PlateGroupModal
        open={groupModalOpen}
        onClose={() => {
          setGroupModalOpen(false)
          setSelectedGroup(null)
        }}
        plates={selectedGroup || []}
      />
      </div>
    </Layout>
  )
}
