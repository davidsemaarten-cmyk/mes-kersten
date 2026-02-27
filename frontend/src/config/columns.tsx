/**
 * Default Column Configurations
 * Phase 9: Column definitions for all table views
 */

import { Badge } from '../components/ui/badge'
import { Tooltip } from '../components/ui/tooltip'
import { QuickClaimButton } from '../components/QuickClaimButton'
import type { ColumnConfig } from '../types/columns'
import type { PlateWithRelations } from '../types/database'

// Helper function to format status
const formatStatus = (status: string) => {
  switch (status) {
    case 'beschikbaar': return 'Beschikbaar'
    case 'geclaimd': return 'Geclaimd'
    case 'bij_laser': return 'Bij Laser'
    default: return status
  }
}

// Helper function to get status badge styling
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

// Helper function to calculate area
const calculateArea = (plate: PlateWithRelations) => {
  return ((plate.width * plate.length) / 1_000_000).toFixed(2)
}

/**
 * Default column configuration for Voorraad (Inventory) table
 * All columns available - user can show/hide and reorder
 */
export const DEFAULT_VOORRAAD_COLUMNS: ColumnConfig[] = [
  {
    id: 'plaatnummer',
    label: 'Plaatnummer',
    accessor: (plate) => (
      <span className="font-medium text-gray-900">{plate.plate_number}</span>
    ),
    visible: true,
    order: 0,
    minWidth: '140px',
    filterable: true,
    sortable: false,
  },
  {
    id: 'status',
    label: 'Status',
    accessor: (plate) => {
      const statusStyle = getStatusBadge(plate.status)
      return (
        <Badge variant={statusStyle.variant} className={statusStyle.className}>
          {formatStatus(plate.status)}
        </Badge>
      )
    },
    visible: true,
    order: 1,
    minWidth: '120px',
    filterable: true,
    sortable: false,
  },
  {
    id: 'claims',
    label: 'Claims',
    accessor: (plate) => {
      const activeClaims = plate.claims?.filter(c => c.actief) || []
      if (activeClaims.length === 0) {
        return <span className="text-sm text-gray-400">-</span>
      }
      return (
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
      )
    },
    visible: true,
    order: 2,
    minWidth: '180px',
    filterable: true,
    sortable: false,
  },
  {
    id: 'materiaal',
    label: 'Materiaal',
    accessor: (plate) => (
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
    ),
    visible: true,
    order: 3,
    minWidth: '150px',
    filterable: true,
    sortable: false,
  },
  {
    id: 'specificatie',
    label: 'Specificatie',
    accessor: (plate) => (
      <span className="text-sm text-gray-600">{plate.quality}</span>
    ),
    visible: true,
    order: 4,
    minWidth: '120px',
    filterable: true,
    sortable: false,
  },
  {
    id: 'breedte',
    label: 'Breedte',
    accessor: (plate) => (
      <span className="text-sm text-gray-600">{plate.width} mm</span>
    ),
    visible: false, // Hidden by default - new column
    order: 5,
    minWidth: '100px',
    filterable: false,
    sortable: false,
  },
  {
    id: 'lengte',
    label: 'Lengte',
    accessor: (plate) => (
      <span className="text-sm text-gray-600">{plate.length} mm</span>
    ),
    visible: false, // Hidden by default - new column
    order: 6,
    minWidth: '100px',
    filterable: false,
    sortable: false,
  },
  {
    id: 'afmeting',
    label: 'Afmetingen',
    accessor: (plate) => (
      <span className="text-sm text-gray-600">
        {plate.width} × {plate.length} mm
        <span className="text-gray-400 ml-2">
          ({calculateArea(plate)} m²)
        </span>
      </span>
    ),
    visible: true, // Combined dimensions - visible by default
    order: 7,
    minWidth: '180px',
    filterable: true,
    sortable: false,
  },
  {
    id: 'dikte',
    label: 'Dikte',
    accessor: (plate) => (
      <span className="text-sm text-gray-600">{plate.thickness} mm</span>
    ),
    visible: true,
    order: 8,
    minWidth: '90px',
    filterable: true,
    sortable: true, // Thickness is sortable
  },
  {
    id: 'gewicht',
    label: 'Gewicht',
    accessor: (plate) => (
      <span className="text-sm text-gray-600">
        {plate.weight ? `${plate.weight} kg` : '-'}
      </span>
    ),
    visible: false, // Hidden by default
    order: 9,
    minWidth: '100px',
    filterable: false,
    sortable: false,
  },
  {
    id: 'oppervlakte',
    label: 'Oppervlakte',
    accessor: (plate) => (
      <span className="text-sm text-gray-600">{calculateArea(plate)} m²</span>
    ),
    visible: false, // Hidden by default
    order: 10,
    minWidth: '110px',
    filterable: false,
    sortable: false,
  },
  {
    id: 'locatie',
    label: 'Locatie',
    accessor: (plate) => (
      <span className="text-sm text-gray-600">{plate.location || '-'}</span>
    ),
    visible: true,
    order: 11,
    minWidth: '120px',
    filterable: true,
    sortable: false,
  },
  {
    id: 'heatnummer',
    label: 'Heatnummer',
    accessor: (plate) => (
      <span className="font-mono text-sm text-gray-900">
        {plate.heatnummer || <span className="text-gray-400">-</span>}
      </span>
    ),
    visible: false, // Hidden by default
    order: 12,
    minWidth: '140px',
    filterable: true,
    sortable: true,
  },
  {
    id: 'acties',
    label: 'Acties',
    accessor: (plate) => (
      <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
        <QuickClaimButton plate={plate} />
      </div>
    ),
    visible: true,
    order: 12,
    minWidth: '140px',
    filterable: false,
    sortable: false,
  },
]

/**
 * Get column configuration for a specific view
 * Can be extended for bij_laser and claims views
 */
export function getDefaultColumns(view: 'voorraad' | 'bij_laser' | 'claims'): ColumnConfig[] {
  switch (view) {
    case 'voorraad':
      return DEFAULT_VOORRAAD_COLUMNS
    case 'bij_laser':
      // Bij laser uses reduced column set
      return DEFAULT_VOORRAAD_COLUMNS.filter(col =>
        ['plaatnummer', 'materiaal', 'specificatie', 'dikte'].includes(col.id)
      ).map(col => ({ ...col, visible: true }))
    case 'claims':
      // Claims view - can be customized later
      return DEFAULT_VOORRAAD_COLUMNS
    default:
      return DEFAULT_VOORRAAD_COLUMNS
  }
}
