/**
 * Column Configuration Types
 * Phase 9: Dynamic column management system
 */

import type { PlateWithRelations } from './database'

export interface ColumnConfig {
  id: string
  label: string
  accessor: (plate: PlateWithRelations) => React.ReactNode
  visible: boolean
  order: number
  minWidth?: string
  filterable?: boolean
  sortable?: boolean
}

export interface UserColumnPreferences {
  voorraad: ColumnConfig[]
  bij_laser: ColumnConfig[]
  claims: ColumnConfig[]
}

export type TableView = 'voorraad' | 'bij_laser' | 'claims'
