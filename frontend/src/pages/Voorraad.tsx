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
import { Plus, Package, Loader2, Search, X, LayoutGrid, List, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

type SortDirection = 'asc' | 'desc' | null

export function Voorraad() {
  const [searchQuery, setSearchQuery] = useState('')
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [bulkClaimModalOpen, setBulkClaimModalOpen] = useState(false)
  const [selectedPlate, setSelectedPlate] = useState<PlateWithRelations | null>(null)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)

  // View mode
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')

  // Sort state for thickness column
  const [thicknessSortDirection, setThicknessSortDirection] = useState<SortDirection>(null)

  // Column filters
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

  const { data: plates, isLoading } = usePlates({ include_consumed: false })

  // Helper functions (must be before filteredPlates useMemo)
  // Format status text
  const formatStatus = (status: string) => {
    switch (status) {
      case 'beschikbaar': return 'Beschikbaar'
      case 'geclaimd': return 'Geclaimd'
      case 'bij_laser': return 'Bij Laser'
      default: return status
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

  // Calculate area for a plate
  const calculateArea = (plate: PlateWithRelations) => {
    return ((plate.width * plate.length) / 1_000_000).toFixed(2)
  }

  // Toggle thickness sort direction: null → desc → asc → null
  const toggleThicknessSort = () => {
    setThicknessSortDirection((current) => {
      if (current === null) return 'desc'
      if (current === 'desc') return 'asc'
      return null
    })
  }

  // Get sort icon based on current sort direction
  const getSortIcon = () => {
    if (thicknessSortDirection === 'desc') {
      return <ArrowDown className="h-4 w-4 ml-1" />
    }
    if (thicknessSortDirection === 'asc') {
      return <ArrowUp className="h-4 w-4 ml-1" />
    }
    return <ArrowUpDown className="h-4 w-4 ml-1 opacity-40" />
  }

  // Extract unique values for column filter suggestions
  const columnOptions = useMemo(() => {
    if (!plates) return {
      plaatnummers: [],
      statuses: [],
      claims: [],
      materialen: [],
      specificaties: [],
      afmetingen: [],
      diktes: [],
      locaties: []
    }

    const plaatnummers = Array.from(new Set(plates.map(p => p.plate_number))).sort()
    const statuses = Array.from(new Set(plates.map(p => formatStatus(p.status)))).sort()
    const claims = Array.from(new Set(
      plates.flatMap(p =>
        (p.claims || [])
          .filter(c => c.actief)
          .map(c => `${c.project_naam}-${c.project_fase}`)
      )
    )).sort()
    const materialen = Array.from(new Set(plates.map(p => p.material?.naam || p.material_prefix))).sort()
    const specificaties = Array.from(new Set(plates.map(p => p.quality))).sort()
    const afmetingen = Array.from(new Set(plates.map(p => `${p.width} × ${p.length}`))).sort()
    const diktes = Array.from(new Set(plates.map(p => `${p.thickness}`))).sort((a, b) => parseFloat(a) - parseFloat(b))
    const locaties = Array.from(new Set(plates.map(p => p.location).filter(Boolean) as string[])).sort()

    return { plaatnummers, statuses, claims, materialen, specificaties, afmetingen, diktes, locaties }
  }, [plates])

  // Filter plates
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

    // Apply column filters
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

    // Apply sorting (after filtering)
    if (thicknessSortDirection) {
      filtered.sort((a, b) => {
        const thicknessA = a.thickness || 0
        const thicknessB = b.thickness || 0

        if (thicknessSortDirection === 'desc') {
          return thicknessB - thicknessA // Thick to thin
        } else {
          return thicknessA - thicknessB // Thin to thick
        }
      })
    }

    return filtered
  }, [plates, searchQuery, columnFilters, thicknessSortDirection])

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
    setThicknessSortDirection(null)
  }

  // Check if any filters are active
  const hasActiveFilters = Object.values(columnFilters).some(v => v !== '') || thicknessSortDirection !== null

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

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Platen laden...</p>
        </div>
      )}

      {/* Empty State - Only show if NO plates at all AND no filters active */}
      {!isLoading && plates && plates.length === 0 && !hasActiveFilters && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-gray-900">Geen platen gevonden</h3>
            <p className="text-sm text-gray-600 mb-4">Voeg platen toe om te beginnen</p>
            <Button onClick={() => setAddModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Eerste Plaat Toevoegen
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Plates View - Table or Grid - Always show if we have plates */}
      {!isLoading && plates && plates.length > 0 && (
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
                  <TableHead
                    className={`font-semibold cursor-pointer select-none hover:bg-gray-100 transition-colors ${
                      thicknessSortDirection ? 'text-blue-700' : 'text-gray-900'
                    }`}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      toggleThicknessSort()
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        e.stopPropagation()
                        toggleThicknessSort()
                      }
                    }}
                    aria-label={`Sorteer op dikte ${
                      thicknessSortDirection === 'desc'
                        ? 'dik naar dun'
                        : thicknessSortDirection === 'asc'
                        ? 'dun naar dik'
                        : 'ongesorteerd'
                    }`}
                  >
                    <div className="flex items-center">
                      Dikte
                      {getSortIcon()}
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">Locatie</TableHead>
                </TableRow>
                {/* Filter Row */}
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="p-2">
                    <ColumnFilter
                      value={columnFilters.plaatnummer}
                      onChange={(v) => updateColumnFilter('plaatnummer', v)}
                      placeholder="Filter..."
                      options={columnOptions.plaatnummers}
                    />
                  </TableHead>
                  <TableHead className="p-2">
                    <ColumnFilter
                      value={columnFilters.status}
                      onChange={(v) => updateColumnFilter('status', v)}
                      placeholder="Filter..."
                      options={columnOptions.statuses}
                    />
                  </TableHead>
                  <TableHead className="p-2">
                    <ColumnFilter
                      value={columnFilters.claims}
                      onChange={(v) => updateColumnFilter('claims', v)}
                      placeholder="Filter..."
                      options={columnOptions.claims}
                    />
                  </TableHead>
                  <TableHead className="p-2">
                    <ColumnFilter
                      value={columnFilters.materiaal}
                      onChange={(v) => updateColumnFilter('materiaal', v)}
                      placeholder="Filter..."
                      options={columnOptions.materialen}
                    />
                  </TableHead>
                  <TableHead className="p-2">
                    <ColumnFilter
                      value={columnFilters.specificatie}
                      onChange={(v) => updateColumnFilter('specificatie', v)}
                      placeholder="Filter..."
                      options={columnOptions.specificaties}
                    />
                  </TableHead>
                  <TableHead className="p-2">
                    <ColumnFilter
                      value={columnFilters.afmeting}
                      onChange={(v) => updateColumnFilter('afmeting', v)}
                      placeholder="Filter..."
                      options={columnOptions.afmetingen}
                    />
                  </TableHead>
                  <TableHead className="p-2">
                    <ColumnFilter
                      value={columnFilters.dikte}
                      onChange={(v) => updateColumnFilter('dikte', v)}
                      placeholder="Filter..."
                      options={columnOptions.diktes}
                    />
                  </TableHead>
                  <TableHead className="p-2">
                    <ColumnFilter
                      value={columnFilters.locatie}
                      onChange={(v) => updateColumnFilter('locatie', v)}
                      placeholder="Filter..."
                      options={columnOptions.locaties}
                    />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlates.length > 0 ? (
                  filteredPlates.map((plate) => {
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
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <Package className="h-8 w-8 mb-2 text-gray-400" />
                        <p className="font-medium">Geen platen gevonden</p>
                        <p className="text-sm text-gray-400 mt-1">
                          Probeer een andere zoekopdracht of filter
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <>
              {filteredPlates.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPlates.map((plate) => (
                    <PlateCard
                      key={plate.id}
                      plate={plate}
                      onClick={() => handlePlateClick(plate)}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Package className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold mb-2 text-gray-900">Geen platen gevonden</h3>
                    <p className="text-sm text-gray-600">
                      Probeer een andere zoekopdracht of filter
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
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
