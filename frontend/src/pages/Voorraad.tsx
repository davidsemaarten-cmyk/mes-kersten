/**
 * Voorraad (Inventory) Page
 * Main inventory view with dynamic column management
 * Phase 9: Drag-and-drop columns, show/hide, horizontal scroll
 */

import { useState, useMemo } from 'react'
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { Layout } from '../components/Layout'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Card, CardContent } from '../components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs'
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
import { LocationReturnButton } from '../components/LocationReturnButton'
import { RemnantButton } from '../components/RemnantButton'
import { ConsumeButton } from '../components/ConsumeButton'
import { NaarLaserButton } from '../components/NaarLaserButton'
import { ColumnVisibilityPopover } from '../components/ColumnVisibilityPopover'
import { ScrollableTable } from '../components/ScrollableTable'
import { DraggableTableHeader } from '../components/DraggableTableHeader'
import { usePlates } from '../hooks/usePlateStock'
import { useColumnPreferences } from '../hooks/useColumnPreferences'
import type { PlateWithRelations } from '../types/database'
import { Plus, Package, Loader2, X, LayoutGrid, List, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle } from 'lucide-react'

type SortDirection = 'asc' | 'desc' | null
type StatusFilter = 'alle' | 'bij_laser' | 'beschikbaar' | 'geclaimd'

export function Voorraad() {
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [bulkClaimModalOpen, setBulkClaimModalOpen] = useState(false)
  const [selectedPlate, setSelectedPlate] = useState<PlateWithRelations | null>(null)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)

  // View mode
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')

  // Status tab filter
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('alle')

  // Sort state for thickness column
  const [thicknessSortDirection, setThicknessSortDirection] = useState<SortDirection>(null)

  // Column management (Phase 9)
  const {
    columns,
    visibleColumns,
    toggleColumn,
    reorderColumns,
    resetToDefault,
    visibleCount,
    totalCount,
  } = useColumnPreferences('voorraad')

  // Column filters
  const [columnFilters, setColumnFilters] = useState({
    plaatnummer: '',
    status: '',
    claims: '',
    materiaal: '',
    specificatie: '',
    afmeting: '',
    dikte: '',
    locatie: '',
    heatnummer: ''
  })

  const { data: plates, isLoading, error } = usePlates({ include_consumed: false })

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
      locaties: [],
      heatnummers: []
    }

    const plaatnummers = Array.from(new Set(plates.map(p => p.plate_number))).sort()
    const statuses = Array.from(new Set(plates.map(p => formatStatus(p.status)))).sort()
    const claims = Array.from(new Set(
      plates.flatMap(p =>
        (p.claims || [])
          .filter(c => c.is_active)
          .map(c => `${c.project_naam}-${c.project_fase}`)
      )
    )).sort()
    const materialen = Array.from(new Set(plates.map(p => p.material?.naam || p.material_prefix))).sort()
    const specificaties = Array.from(new Set(plates.map(p => p.quality))).sort()
    const afmetingen = Array.from(new Set(plates.map(p => `${p.width} × ${p.length}`))).sort()
    const diktes = Array.from(new Set(plates.map(p => `${p.thickness}`))).sort((a, b) => parseFloat(a) - parseFloat(b))
    const locaties = Array.from(new Set(plates.map(p => p.location).filter(Boolean) as string[])).sort()
    const heatnummers = Array.from(new Set(plates.map(p => p.heatnummer).filter(Boolean) as string[])).sort()

    return { plaatnummers, statuses, claims, materialen, specificaties, afmetingen, diktes, locaties, heatnummers }
  }, [plates])

  // Calculate status counts
  const statusCounts = useMemo(() => {
    if (!plates) return { alle: 0, bij_laser: 0, beschikbaar: 0, geclaimd: 0 }

    return {
      alle: plates.length,
      bij_laser: plates.filter(p => p.status === 'bij_laser').length,
      beschikbaar: plates.filter(p => p.status === 'beschikbaar').length,
      geclaimd: plates.filter(p => p.status === 'geclaimd').length
    }
  }, [plates])

  // Filter plates
  const filteredPlates = useMemo(() => {
    if (!plates) return []

    let filtered = [...plates]

    // Apply status tab filter first
    if (statusFilter !== 'alle') {
      filtered = filtered.filter(p => p.status === statusFilter)
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
        const activeClaims = p.claims?.filter(c => c.is_active) || []
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
    if (columnFilters.heatnummer) {
      const query = columnFilters.heatnummer.toLowerCase()
      filtered = filtered.filter(p => (p.heatnummer || '').toLowerCase().includes(query))
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
  }, [plates, statusFilter, columnFilters, thicknessSortDirection])

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
    setStatusFilter('alle')
    setColumnFilters({
      plaatnummer: '',
      status: '',
      claims: '',
      materiaal: '',
      specificatie: '',
      afmeting: '',
      dikte: '',
      locatie: '',
      heatnummer: ''
    })
    setThicknessSortDirection(null)
  }

  // Check if any filters are active
  const hasActiveFilters = statusFilter !== 'alle' || Object.values(columnFilters).some(v => v !== '') || thicknessSortDirection !== null

  // Handle column drag end (Phase 9)
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      reorderColumns(active.id as string, over.id as string)
    }
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

          {/* Column Visibility (Phase 9) - Only show in table view */}
          {viewMode === 'table' && statusFilter !== 'bij_laser' && (
            <ColumnVisibilityPopover
              columns={columns}
              onToggle={toggleColumn}
              onReset={resetToDefault}
              visibleCount={visibleCount}
              totalCount={totalCount}
            />
          )}

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

      {/* Status Tabs */}
      <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
        <TabsList className="w-full justify-start bg-white border border-gray-200">
          <TabsTrigger value="alle" className="data-[state=active]:bg-gray-100">
            Alle Platen
            <Badge variant="secondary" className="ml-2 bg-gray-100 text-gray-700">
              {statusCounts.alle}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="bij_laser" className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700">
            Bij Laser
            <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-700">
              {statusCounts.bij_laser}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="beschikbaar" className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700">
            Beschikbaar
            <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">
              {statusCounts.beschikbaar}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="geclaimd" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            Geclaimd
            <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">
              {statusCounts.geclaimd}
            </Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Platen laden...</p>
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-800">Kon voorraadgegevens niet laden</p>
              <p className="text-sm text-red-600 mt-1">Probeer de pagina te vernieuwen. Als het probleem aanhoudt, controleer of de backend draait.</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State - Only show if NO plates at all AND no filters active */}
      {!isLoading && !error && plates && plates.length === 0 && !hasActiveFilters && (
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
      {!isLoading && !error && plates && plates.length > 0 && (
        <>
          {viewMode === 'table' ? (
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <ScrollableTable>
                  <Table>
              <TableHeader className="bg-gray-50 sticky top-0 z-10">
                {statusFilter === 'bij_laser' ? (
                  // Bij Laser: Fixed columns, no drag-and-drop
                  <TableRow className="hover:bg-gray-50">
                    <TableHead className="font-semibold text-gray-900">Plaatnummer</TableHead>
                    <TableHead className="font-semibold text-gray-900">Materiaal</TableHead>
                    <TableHead className="font-semibold text-gray-900">Specificatie</TableHead>
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
                    <TableHead className="font-semibold text-gray-900 text-right">Acties</TableHead>
                  </TableRow>
                ) : (
                  // Regular view: Dynamic draggable columns
                  <SortableContext items={visibleColumns.map(col => col.id)} strategy={horizontalListSortingStrategy}>
                    <TableRow className="hover:bg-gray-50">
                      {visibleColumns.map((column) => (
                        <DraggableTableHeader
                          key={column.id}
                          column={column}
                          className={`font-semibold text-gray-900 ${
                            column.id === 'dikte' ? 'cursor-pointer select-none hover:bg-gray-100 transition-colors' : ''
                          } ${column.id === 'dikte' && thicknessSortDirection ? 'text-blue-700' : ''}`}
                          onClick={column.id === 'dikte' ? (e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            toggleThicknessSort()
                          } : undefined}
                          role={column.id === 'dikte' ? 'button' : undefined}
                          tabIndex={column.id === 'dikte' ? 0 : undefined}
                          onKeyDown={column.id === 'dikte' ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              e.stopPropagation()
                              toggleThicknessSort()
                            }
                          } : undefined}
                          aria-label={column.id === 'dikte' ? `Sorteer op dikte ${
                            thicknessSortDirection === 'desc'
                              ? 'dik naar dun'
                              : thicknessSortDirection === 'asc'
                              ? 'dun naar dik'
                              : 'ongesorteerd'
                          }` : undefined}
                        >
                          {column.label}
                          {column.id === 'dikte' && getSortIcon()}
                        </DraggableTableHeader>
                      ))}
                      <TableHead className="font-semibold text-gray-900 text-right">Acties</TableHead>
                    </TableRow>
                  </SortableContext>
                )}
                {/* Filter Row */}
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  {statusFilter === 'bij_laser' ? (
                    // Bij Laser: Fixed filter columns
                    <>
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
                          value={columnFilters.dikte}
                          onChange={(v) => updateColumnFilter('dikte', v)}
                          placeholder="Filter..."
                          options={columnOptions.diktes}
                        />
                      </TableHead>
                      <TableHead className="p-2" />
                    </>
                  ) : (
                    // Regular view: Dynamic filter columns + actions column
                    <>
                      {visibleColumns.map((column) => (
                        <TableHead key={column.id} className="p-2">
                          {column.filterable !== false ? (
                            <ColumnFilter
                              value={columnFilters[column.id as keyof typeof columnFilters] || ''}
                              onChange={(v) => updateColumnFilter(column.id as keyof typeof columnFilters, v)}
                              placeholder="Filter..."
                              options={columnOptions[`${column.id}s` as keyof typeof columnOptions] || columnOptions[column.id as keyof typeof columnOptions] || []}
                            />
                          ) : null}
                        </TableHead>
                      ))}
                      <TableHead className="p-2" />
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlates.length > 0 ? (
                  filteredPlates.map((plate) => {
                    return (
                      <TableRow
                        key={plate.id}
                        onClick={statusFilter !== 'bij_laser' ? () => handlePlateClick(plate) : undefined}
                        className={statusFilter !== 'bij_laser' ? "cursor-pointer transition-colors h-14" : "transition-colors h-14"}
                      >
                        {statusFilter === 'bij_laser' ? (
                          // Bij Laser: Fixed cells
                          <>
                            <TableCell className="font-medium text-gray-900">
                              {plate.plate_number}
                            </TableCell>
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
                            <TableCell className="text-sm text-gray-600">
                              {plate.quality}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {plate.thickness} mm
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2 justify-end">
                                <LocationReturnButton plate={plate} />
                                <RemnantButton plate={plate} />
                                <ConsumeButton plate={plate} />
                              </div>
                            </TableCell>
                          </>
                        ) : (
                          // Regular view: Dynamic cells + actions column
                          <>
                            {visibleColumns.map((column) => (
                              <TableCell key={column.id}>
                                {column.accessor(plate)}
                              </TableCell>
                            ))}
                            <TableCell>
                              <div className="flex gap-2 justify-end">
                                <NaarLaserButton plate={plate} />
                              </div>
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={statusFilter === 'bij_laser' ? 5 : visibleColumns.length + 1} className="h-32 text-center">
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
                </ScrollableTable>
              </DndContext>
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
