/**
 * DraggableTableHeader Component
 * Phase 9: Draggable table headers with dnd-kit
 */

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TableHead } from './ui/table'
import type { ColumnConfig } from '../types/columns'

interface DraggableTableHeaderProps {
  column: ColumnConfig
  children?: React.ReactNode
  className?: string
  onClick?: (e: React.MouseEvent) => void
  role?: string
  tabIndex?: number
  onKeyDown?: (e: React.KeyboardEvent) => void
  'aria-label'?: string
}

export function DraggableTableHeader({
  column,
  children,
  className,
  ...props
}: DraggableTableHeaderProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    minWidth: column.minWidth || 'auto',
  }

  return (
    <TableHead
      ref={setNodeRef}
      style={style}
      className={`${className || ''} ${isDragging ? 'z-50' : ''}`}
      {...attributes}
      {...listeners}
      {...props}
    >
      <div className="flex items-center gap-2">
        {/* Drag handle indicator */}
        <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
          <svg
            width="10"
            height="14"
            viewBox="0 0 10 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="2" cy="2" r="1.5" fill="currentColor" />
            <circle cx="8" cy="2" r="1.5" fill="currentColor" />
            <circle cx="2" cy="7" r="1.5" fill="currentColor" />
            <circle cx="8" cy="7" r="1.5" fill="currentColor" />
            <circle cx="2" cy="12" r="1.5" fill="currentColor" />
            <circle cx="8" cy="12" r="1.5" fill="currentColor" />
          </svg>
        </div>
        {children}
      </div>
    </TableHead>
  )
}
