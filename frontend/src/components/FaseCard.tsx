/**
 * FaseCard Component
 * Phase 1.1: Projects and Fases
 *
 * Card display for fase in project detail view
 */

import { Card, CardHeader, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import type { Fase } from '../hooks/useProjects'
import { FileText, Package, ShoppingCart } from 'lucide-react'

interface FaseCardProps {
  fase: Fase
  onClick?: () => void
}

export function FaseCard({ fase, onClick }: FaseCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'actief':
        return 'bg-green-500'
      case 'gereed':
        return 'bg-blue-500'
      case 'gearchiveerd':
        return 'bg-gray-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'actief':
        return 'Actief'
      case 'gereed':
        return 'Gereed'
      case 'gearchiveerd':
        return 'Gearchiveerd'
      default:
        return status
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('nl-NL', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return null
    }
  }

  return (
    <Card
      className={onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold font-mono">{fase.full_code || fase.fase_nummer}</h3>
              <Badge className={getStatusColor(fase.status)}>{getStatusLabel(fase.status)}</Badge>
            </div>
            {fase.beschrijving && (
              <p className="text-sm text-muted-foreground mt-1">{fase.beschrijving}</p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            <span>
              {fase.order_count} {fase.order_count === 1 ? 'order' : 'orders'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span>
              {fase.posnummer_count} {fase.posnummer_count === 1 ? 'posnr' : 'posnrs'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span>
              {fase.file_count} {fase.file_count === 1 ? 'bestand' : 'bestanden'}
            </span>
          </div>
        </div>

        {fase.montage_datum && (
          <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
            Montage datum: {formatDate(fase.montage_datum)}
          </div>
        )}

        {fase.opmerkingen_werkplaats && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-1">Opmerkingen werkplaats:</p>
            <p className="text-sm line-clamp-2">{fase.opmerkingen_werkplaats}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
