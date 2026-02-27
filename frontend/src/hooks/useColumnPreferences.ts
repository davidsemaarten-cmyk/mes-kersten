/**
 * useColumnPreferences Hook
 * Phase 9: Manage column visibility, order, and persistence
 */

import { useState, useEffect, useCallback } from 'react'
import type { ColumnConfig, TableView } from '../types/columns'
import { getDefaultColumns } from '../config/columns'

const STORAGE_KEY = 'mes_kersten_column_preferences'

interface StoredPreferences {
  [key: string]: {
    columnOrder: string[]
    visibleColumns: string[]
  }
}

export function useColumnPreferences(view: TableView) {
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    // Load from localStorage or use defaults
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const preferences: StoredPreferences = JSON.parse(stored)
        const viewPrefs = preferences[view]

        if (viewPrefs) {
          // Clone defaults to avoid mutating the module-level constant array
          const defaults = getDefaultColumns(view).map(col => ({ ...col }))

          // Merge stored preferences with defaults
          // This handles new columns added after user saved preferences
          const columnMap = new Map(defaults.map(col => [col.id, col]))

          // Update visibility from stored preferences
          defaults.forEach(col => {
            col.visible = viewPrefs.visibleColumns.includes(col.id)
          })

          // Reorder columns based on stored order
          const ordered: ColumnConfig[] = []
          viewPrefs.columnOrder.forEach((id, index) => {
            const col = columnMap.get(id)
            if (col) {
              col.order = index
              ordered.push(col)
              columnMap.delete(id)
            }
          })

          // Add any new columns that weren't in stored preferences
          columnMap.forEach(col => ordered.push(col))

          return ordered.sort((a, b) => a.order - b.order)
        }
      } catch (error) {
        console.error('Error loading column preferences:', error)
      }
    }

    return getDefaultColumns(view)
  })

  // Save preferences to localStorage
  const savePreferences = useCallback((cols: ColumnConfig[]) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      const preferences: StoredPreferences = stored ? JSON.parse(stored) : {}

      preferences[view] = {
        columnOrder: cols.map(col => col.id),
        visibleColumns: cols.filter(col => col.visible).map(col => col.id)
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
    } catch (error) {
      console.error('Error saving column preferences:', error)
    }
  }, [view])

  // Toggle column visibility
  const toggleColumn = useCallback((columnId: string) => {
    setColumns(prev => {
      const visibleCount = prev.filter(col => col.visible).length

      const updated = prev.map(col => {
        if (col.id === columnId) {
          // Don't allow hiding if it would leave less than 3 columns visible
          if (col.visible && visibleCount <= 3) {
            return col
          }
          return { ...col, visible: !col.visible }
        }
        return col
      })

      savePreferences(updated)
      return updated
    })
  }, [savePreferences])

  // Reorder columns (for drag and drop)
  const reorderColumns = useCallback((activeId: string, overId: string) => {
    setColumns(prev => {
      const oldIndex = prev.findIndex(col => col.id === activeId)
      const newIndex = prev.findIndex(col => col.id === overId)

      if (oldIndex === -1 || newIndex === -1) return prev

      const result = Array.from(prev)
      const [removed] = result.splice(oldIndex, 1)
      result.splice(newIndex, 0, removed)

      // Update order property
      const updated = result.map((col, index) => ({ ...col, order: index }))

      savePreferences(updated)
      return updated
    })
  }, [savePreferences])

  // Reset to default configuration
  const resetToDefault = useCallback(() => {
    const defaults = getDefaultColumns(view).map(col => ({ ...col }))
    setColumns(defaults)
    savePreferences(defaults)
  }, [view, savePreferences])

  // Get visible columns only
  const visibleColumns = columns.filter(col => col.visible)

  return {
    columns,
    visibleColumns,
    toggleColumn,
    reorderColumns,
    resetToDefault,
    visibleCount: visibleColumns.length,
    totalCount: columns.length,
  }
}
