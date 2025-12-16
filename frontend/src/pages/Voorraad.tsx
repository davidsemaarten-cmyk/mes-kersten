/**
 * Voorraad (Inventory) Page
 * Main inventory view for admin and werkvoorbereiders
 */

import { useState, useMemo } from 'react'
import Layout from '../components/Layout'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Card, CardContent } from '../components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { Tooltip } from '../components/ui/tooltip'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table'
import { AddPlatesModal } from '../components/AddPlatesModal'
import { BulkClaimModal } from '../components/BulkClaimModal'
import { PlateDetailsModal } from '../components/PlateDetailsModal'
import { PlateCard } from '../components/PlateCard'
import { ColumnFilter } from '../components/ColumnFilter'
import { usePlates } from '../hooks/usePlateStock'
import type { PlateWithRelations } from '../types/database'
import { Plus, Package, Loader2, Search, X, ArrowUpDown, ArrowUp, ArrowDown, LayoutGrid, List } from 'lucide-react'

export function Voorraad() {
  const [searchQuery, setSearchQuery] = useState('')
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [bulkClaimModalOpen, setBulkClaimModalOpen] = useState(false)
  const [selectedPlate, setSelectedPlate] = useState<PlateWithRelations | null>(null)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)

  // View mode
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')

  // Filters
  const [materialFilter, setMaterialFilter] = useState<string>('all')
  const [qualityFilter, setQualityFilter] = useState<string>('all')
  const [surfaceFilter, setSurfaceFilter] = useState<string>('all')
  const [thicknessFilter, setThicknessFilter] = useState<string>('all')

  // Column filters (Phase 4)
  const [columnFilters, setColumnFilters] = useState({
    plaatnummer: '',
    status: '',
    claims: '',
    materiaal: '',
    specificatie: '',
    afmeting: '',
    dikte: '',
    locatie: ''
  })

  // Sort
  const [sortBy, setSortBy] = useState<'none' | 'size' | 'thickness'>('none')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const { data: plates, isLoading } = usePlates({ include_consumed: false })

  // Extract unique filter values
  const filterOptions = useMemo(() => {
    if (!plates) return { materials: [], qualities: [], surfaces: [], thicknesses: [] }

    const materials = Array.from(new Set(plates.map(p => p.material?.naam || p.material_prefix).filter(Boolean))).sort()
    const qualities = Array.from(new Set(plates.map(p => p.quality))).sort()
    const surfaces = Array.from(new Set(plates.map(p => p.material?.oppervlaktebewerking).filter(Boolean))).sort()
    const thicknesses = Array.from(new Set(plates.map(p => p.thickness))).sort((a, b) => a - b)

    return { materials, qualities, surfaces, thicknesses }
  }, [plates])

  // Filter and sort plates
  const filteredPlates = useMemo(() => {
    if (!plates) return []

    let filtered = [...plates]

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(plate => {
        return (
          plate.plate_number.toLowerCase().includes(query) ||
          plate.material_prefix.toLowerCase().includes(query) ||
          plate.quality.toLowerCase().includes(query) ||
          plate.location?.toLowerCase().includes(query) ||
          plate.material?.naam?.toLowerCase().includes(query)
        )
      })
    }

    // Apply filters
    if (materialFilter !== 'all') {
      filtered = filtered.filter(p =>
        (p.material?.naam || p.material_prefix) === materialFilter
      )
    }
    if (qualityFilter !== 'all') {
      filtered = filtered.filter(p => p.quality === qualityFilter)
    }
    if (surfaceFilter !== 'all') {
      filtered = filtered.filter(p => p.material?.oppervlaktebewerking === surfaceFilter)
    }
    if (thicknessFilter !== 'all') {
      filtered = filtered.filter(p => p.thickness.toString() === thicknessFilter)
    }

    // Apply column filters (Phase 4)
    if (columnFilters.plaatnummer) {
      const query = columnFilters.plaatnummer.toLowerCase()
      filtered = filtered.filter(p => p.plate_number.toLowerCase().includes(query))
    }
    if (columnFilters.status) {
      const query = columnFilters.status.toLowerCase()
      filtered = filtered.filter(p => formatStatus(p.status).toLowerCase().includes(query))
    }
    if (columnFilters.claims) {
      const query = columnFilters.claims.toLowerCase()
      filtered = filtered.filter(p => {
        const activeClaims = p.claims?.filter(c => c.actief) || []
        return activeClaims.some(c =>
          `${c.project_naam}-${c.project_fase}`.toLowerCase().includes(query)
        )
      })
    }
    if (columnFilters.materiaal) {
      const query = columnFilters.materiaal.toLowerCase()
      filtered = filtered.filter(p =>
        (p.material?.naam || p.material_prefix).toLowerCase().includes(query)
      )
    }
    if (columnFilters.specificatie) {
      const query = columnFilters.specificatie.toLowerCase()
      filtered = filtered.filter(p => p.quality.toLowerCase().includes(query))
    }
    if (columnFilters.afmeting) {
      const query = columnFilters.afmeting.toLowerCase()
      filtered = filtered.filter(p =>
        `${p.width} × ${p.length}`.toLowerCase().includes(query) ||
        `${p.width}`.includes(query) ||
        `${p.length}`.includes(query)
      )
    }
    if (columnFilters.dikte) {
      const query = columnFilters.dikte.toLowerCase()
      filtered = filtered.filter(p => p.thickness.toString().includes(query))
    }
    if (columnFilters.locatie) {
      const query = columnFilters.locatie.toLowerCase()
      filtered = filtered.filter(p => (p.location || '').toLowerCase().includes(query))
    }

    // Apply sorting
    if (sortBy === 'size') {
      filtered.sort((a, b) => {
        const areaA = a.width * a.length
        const areaB = b.width * b.length
        return sortDirection === 'asc' ? areaA - areaB : areaB - areaA
      })
    } else if (sortBy === 'thickness') {
      filtered.sort((a, b) => {
        return sortDirection === 'asc' ? a.thickness - b.thickness : b.thickness - a.thickness
      })
    }

    return filtered
  }, [plates, searchQuery, materialFilter, qualityFilter, surfaceFilter, thicknessFilter, columnFilters, sortBy, sortDirection])

  const handlePlateClick = (plate: PlateWithRelations) => {
    setSelectedPlate(plate)
    setDetailsModalOpen(true)
  }

  // Update column filter helper
  const updateColumnFilter = (column: keyof typeof columnFilters, value: string) => {
    setColumnFilters(prev => ({ ...prev, [column]: value }))
  }

  // Clear all filters
  const clearAllFilters = () => {
    setMaterialFilter('all')
    setQualityFilter('all')
    setSurfaceFilter('all')
    setThicknessFilter('all')
    setSortBy('none')
    setColumnFilters({
      plaatnummer: '',
      status: '',
      claims: '',
      materiaal: '',
      specificatie: '',
      afmeting: '',
      dikte: '',
      locatie: ''
    })
  }

  // Check if any filters are active
  const hasActiveFilters = materialFilter !== 'all' || qualityFilter !== 'all' ||
                          surfaceFilter !== 'all' || thicknessFilter !== 'all' || sortBy !== 'none'

  // Toggle sort direction
  const toggleSort = (newSortBy: 'size' | 'thickness') => {
    if (sortBy === newSortBy) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(newSortBy)
      setSortDirection('asc')
    }
  }

  // Get status badge styling (subtle Linear-style)
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'beschikbaar':
        return { variant: 'outline' as const, className: 'border-green-200 bg-green-50 text-green-700 hover:bg-green-50' }
      case 'geclaimd':
        return { variant: 'outline' as const, className: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50' }
      case 'bij_laser':
        return { variant: 'outline' as const, className: 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-50' }
      default:
        return { variant: 'outline' as const, className: '' }
    }
  }

  // Format status text
  const formatStatus = (status: string) => {
    switch (status) {
      case 'beschikbaar': return 'Beschikbaar'
      case 'geclaimd': return 'Geclaimd'
      case 'bij_laser': return 'Bij Laser'
      default: return status
    }
  }

  // Calculate area for a plate
  const calculateArea = (plate: PlateWithRelations) => {
    return ((plate.width * plate.length) / 1_000_000).toFixed(2)
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Voorraad</h1>
          <p className="text-sm text-gray-600 mt-1">
            {plates ? `${plates.length} platen in voorraad` : 'Laden...'}
          </p>
        </div>

        <div className="flex gap-2">
          {/* View Toggle */}
          <div className="flex border border-gray-300 rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 text-sm transition-colors ${
                viewMode === 'table'
                  ? 'bg-gray-100 text-gray-900'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
              title="Tabelweergave"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 text-sm transition-colors border-l border-gray-300 ${
                viewMode === 'grid'
                  ? 'bg-gray-100 text-gray-900'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
              title="Kaartweergave"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>

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

      {/* Search Bar */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Zoek op plaatnummer, materiaal, kwaliteit, locatie..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-gray-300 bg-white"
          />
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Material Filter */}
          <Select value={materialFilter} onValueChange={setMaterialFilter}>
            <SelectTrigger className="w-[180px] bg-white border-gray-300">
              <SelectValue placeholder="Materiaal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle materialen</SelectItem>
              {filterOptions.materials.map(mat => (
                <SelectItem key={mat} value={mat}>{mat}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Quality Filter */}
          <Select value={qualityFilter} onValueChange={setQualityFilter}>
            <SelectTrigger className="w-[180px] bg-white border-gray-300">
              <SelectValue placeholder="Specificatie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle specificaties</SelectItem>
              {filterOptions.qualities.map(qual => (
                <SelectItem key={qual} value={qual}>{qual}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Surface Filter */}
          <Select value={surfaceFilter} onValueChange={setSurfaceFilter}>
            <SelectTrigger className="w-[200px] bg-white border-gray-300">
              <SelectValue placeholder="Oppervlaktebewerking" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle bewerkingen</SelectItem>
              {filterOptions.surfaces.map(surf => (
                <SelectItem key={surf} value={surf}>{surf}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Thickness Filter */}
          <Select value={thicknessFilter} onValueChange={setThicknessFilter}>
            <SelectTrigger className="w-[140px] bg-white border-gray-300">
              <SelectValue placeholder="Dikte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle diktes</SelectItem>
              {filterOptions.thicknesses.map(thick => (
                <SelectItem key={thick} value={thick.toString()}>{thick} mm</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Divider */}
          <div className="h-6 w-px bg-gray-300" />

          {/* Sort by Size */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleSort('size')}
            className={`gap-1 ${sortBy === 'size' ? 'bg-gray-100' : 'bg-white'} border-gray-300`}
          >
            Grootte
            {sortBy === 'size' && (
              sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
            )}
            {sortBy !== 'size' && <ArrowUpDown className="h-3 w-3 opacity-40" />}
          </Button>

          {/* Sort by Thickness */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleSort('thickness')}
            className={`gap-1 ${sortBy === 'thickness' ? 'bg-gray-100' : 'bg-white'} border-gray-300`}
          >
            Dikte
            {sortBy === 'thickness' && (
              sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
            )}
            {sortBy !== 'thickness' && <ArrowUpDown className="h-3 w-3 opacity-40" />}
          </Button>

          {/* Clear All Button */}
          {hasActiveFilters && (
            <>
              <div className="h-6 w-px bg-gray-300" />
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="gap-1 text-gray-600 hover:text-gray-900"
              >
                <X className="h-4 w-4" />
                Wis filters
              </Button>
            </>
          )}
        </div>

        {/* Active Filter Badges */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-200">
            {materialFilter !== 'all' && (
              <Badge
                variant="outline"
                className="gap-1 px-2 py-1 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
              >
                {materialFilter}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => setMaterialFilter('all')}
                />
              </Badge>
            )}
            {qualityFilter !== 'all' && (
              <Badge
                variant="outline"
                className="gap-1 px-2 py-1 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
              >
                {qualityFilter}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => setQualityFilter('all')}
                />
              </Badge>
            )}
            {surfaceFilter !== 'all' && (
              <Badge
                variant="outline"
                className="gap-1 px-2 py-1 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
              >
                {surfaceFilter}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => setSurfaceFilter('all')}
                />
              </Badge>
            )}
            {thicknessFilter !== 'all' && (
              <Badge
                variant="outline"
                className="gap-1 px-2 py-1 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
              >
                {thicknessFilter} mm
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => setThicknessFilter('all')}
                />
              </Badge>
            )}
            {sortBy !== 'none' && (
              <Badge
                variant="outline"
                className="gap-1 px-2 py-1 bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200"
              >
                Sorteer: {sortBy === 'size' ? 'Grootte' : 'Dikte'} ({sortDirection === 'asc' ? '↑' : '↓'})
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => setSortBy('none')}
                />
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Platen laden...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredPlates.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-gray-900">Geen platen gevonden</h3>
            <p className="text-sm text-gray-600 mb-4">
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

      {/* Plates View - Table or Grid */}
      {!isLoading && filteredPlates.length > 0 && (
        <>
          {viewMode === 'table' ? (
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <Table>
              <TableHeader className="bg-gray-50 sticky top-0 z-10">
                <TableRow className="hover:bg-gray-50">
                  <TableHead className="font-semibold text-gray-900">Plaatnummer</TableHead>
                  <TableHead className="font-semibold text-gray-900">Status</TableHead>
                  <TableHead className="font-semibold text-gray-900">Claims</TableHead>
                  <TableHead className="font-semibold text-gray-900">Materiaal</TableHead>
                  <TableHead className="font-semibold text-gray-900">Specificatie</TableHead>
                  <TableHead className="font-semibold text-gray-900">Afmetingen</TableHead>
                  <TableHead className="font-semibold text-gray-900">Dikte</TableHead>
                  <TableHead className="font-semibold text-gray-900">Locatie</TableHead>
                </TableRow>
                {/* Filter Row */}
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="p-2">
                    <ColumnFilter
                      value={columnFilters.plaatnummer}
                      onChange={(v) => updateColumnFilter('plaatnummer', v)}
                      placeholder="Filter..."
                    />
                  </TableHead>
                  <TableHead className="p-2">
                    <ColumnFilter
                      value={columnFilters.status}
                      onChange={(v) => updateColumnFilter('status', v)}
                      placeholder="Filter..."
                    />
                  </TableHead>
                  <TableHead className="p-2">
                    <ColumnFilter
                      value={columnFilters.claims}
                      onChange={(v) => updateColumnFilter('claims', v)}
                      placeholder="Filter..."
                    />
                  </TableHead>
                  <TableHead className="p-2">
                    <ColumnFilter
                      value={columnFilters.materiaal}
                      onChange={(v) => updateColumnFilter('materiaal', v)}
                      placeholder="Filter..."
                    />
                  </TableHead>
                  <TableHead className="p-2">
                    <ColumnFilter
                      value={columnFilters.specificatie}
                      onChange={(v) => updateColumnFilter('specificatie', v)}
                      placeholder="Filter..."
                    />
                  </TableHead>
                  <TableHead className="p-2">
                    <ColumnFilter
                      value={columnFilters.afmeting}
                      onChange={(v) => updateColumnFilter('afmeting', v)}
                      placeholder="Filter..."
                    />
                  </TableHead>
                  <TableHead className="p-2">
                    <ColumnFilter
                      value={columnFilters.dikte}
                      onChange={(v) => updateColumnFilter('dikte', v)}
                      placeholder="Filter..."
                    />
                  </TableHead>
                  <TableHead className="p-2">
                    <ColumnFilter
                      value={columnFilters.locatie}
                      onChange={(v) => updateColumnFilter('locatie', v)}
                      placeholder="Filter..."
                    />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlates.map((plate) => {
                  const statusStyle = getStatusBadge(plate.status)
                  const activeClaims = plate.claims?.filter(c => c.actief) || []

                  return (
                    <TableRow
                      key={plate.id}
                      onClick={() => handlePlateClick(plate)}
                      className="cursor-pointer hover:bg-gray-50 transition-colors h-14"
                    >
                      {/* Plaatnummer */}
                      <TableCell className="font-medium text-gray-900">
                        {plate.plate_number}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge variant={statusStyle.variant} className={statusStyle.className}>
                          {formatStatus(plate.status)}
                        </Badge>
                      </TableCell>

                      {/* Claims */}
                      <TableCell>
                        {activeClaims.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {activeClaims.slice(0, 3).map((claim, idx) => (
                              <Tooltip
                                key={idx}
                                delay={100}
                                content={
                                  <div className="text-left">
                                    <div className="font-medium">{claim.project_naam}-{claim.project_fase}</div>
                                    {claim.m2_geclaimd && <div className="text-gray-300 mt-0.5">{claim.m2_geclaimd} m² geclaimd</div>}
                                    {claim.opmerkingen && <div className="text-gray-300 mt-0.5">{claim.opmerkingen}</div>}
                                    <div className="text-gray-400 text-[10px] mt-1">
                                      {new Date(claim.created_at).toLocaleDateString('nl-NL')}
                                    </div>
                                  </div>
                                }
                              >
                                <Badge
                                  variant="outline"
                                  className="text-xs px-2 py-0.5 h-6 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors cursor-help"
                                >
                                  {claim.project_naam}-{claim.project_fase}
                                </Badge>
                              </Tooltip>
                            ))}
                            {activeClaims.length > 3 && (
                              <Tooltip
                                delay={100}
                                content={
                                  <div className="text-left space-y-1">
                                    {activeClaims.slice(3).map((claim, idx) => (
                                      <div key={idx} className="text-xs">
                                        {claim.project_naam}-{claim.project_fase}
                                      </div>
                                    ))}
                                  </div>
                                }
                              >
                                <Badge
                                  variant="outline"
                                  className="text-xs px-2 py-0.5 h-6 border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors cursor-help"
                                >
                                  +{activeClaims.length - 3}
                                </Badge>
                              </Tooltip>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </TableCell>

                      {/* Materiaal */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {plate.material?.kleur && (
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: plate.material.kleur }}
                            />
                          )}
                          <span className="text-sm text-gray-900">
                            {plate.material?.naam || plate.material_prefix}
                          </span>
                        </div>
                      </TableCell>

                      {/* Specificatie */}
                      <TableCell className="text-sm text-gray-600">
                        {plate.quality}
                      </TableCell>

                      {/* Afmetingen */}
                      <TableCell className="text-sm text-gray-600">
                        {plate.width} × {plate.length} mm
                        <span className="text-gray-400 ml-2">
                          ({calculateArea(plate)} m²)
                        </span>
                      </TableCell>

                      {/* Dikte */}
                      <TableCell className="text-sm text-gray-600">
                        {plate.thickness} mm
                      </TableCell>

                      {/* Locatie */}
                      <TableCell className="text-sm text-gray-600">
                        {plate.location || '-'}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPlates.map((plate) => (
                <PlateCard
                  key={plate.id}
                  plate={plate}
                  onClick={() => handlePlateClick(plate)}
                />
              ))}
            </div>
          )}
        </>
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
      </div>
    </Layout>
  )
}
