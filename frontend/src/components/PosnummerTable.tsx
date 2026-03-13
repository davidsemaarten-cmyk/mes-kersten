/**
 * Table component for displaying and managing posnummers
 * Shows part numbers with material, dimensions, and actions
 */

import { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Package, Pencil, Trash2, Search } from 'lucide-react'
import { usePosnummers, useDeletePosnummer } from '@/hooks/usePosnummers'
import { usePermissions } from '@/hooks/usePermissions'
import { toast } from 'sonner'
import type { Posnummer } from '@/types/database'

interface PosnummerTableProps {
  faseId: string
  onEdit?: (posnummer: Posnummer) => void
  onAdd?: () => void
}

export function PosnummerTable({ faseId, onEdit, onAdd }: PosnummerTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const { permissions, canManageProjects } = usePermissions()

  const { data: posnummers, isLoading } = usePosnummers(faseId, {
    materiaal: searchQuery || undefined,
  })

  const deleteMutation = useDeletePosnummer(faseId)

  const handleDelete = async (posnummer: Posnummer) => {
    if (!confirm(`Weet je zeker dat je posnummer ${posnummer.posnr} wilt verwijderen?`)) {
      return
    }

    try {
      await deleteMutation.mutateAsync(posnummer.id)
      toast.success(`Posnummer ${posnummer.posnr} verwijderd`)
    } catch (error: any) {
      const message = error?.response?.data?.detail || 'Fout bij verwijderen posnummer'
      toast.error(message)
    }
  }

  const formatDimensions = (posnummer: Posnummer): string => {
    const parts = []
    if (posnummer.length_mm) parts.push(`L${posnummer.length_mm}`)
    if (posnummer.width_mm) parts.push(`B${posnummer.width_mm}`)
    if (posnummer.height_mm) parts.push(`H${posnummer.height_mm}`)
    return parts.join(' × ') || '-'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Laden...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoek op materiaal..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        {searchQuery && (
          <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')}>
            Wis filter
          </Button>
        )}
      </div>

      {/* Table */}
      {!posnummers || posnummers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
          <Package className="mx-auto h-12 w-12 opacity-30 mb-4" />
          <p className="text-sm">
            {searchQuery ? 'Geen posnummers gevonden met dit materiaal' : 'Nog geen posnummers aangemaakt.'}
          </p>
          {!searchQuery && onAdd && canManageProjects && (
            <Button variant="outline" size="sm" className="mt-4" onClick={onAdd}>
              Eerste posnummer toevoegen
            </Button>
          )}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Posnr</TableHead>
                <TableHead>Materiaal</TableHead>
                <TableHead>Profiel</TableHead>
                <TableHead>Afmetingen (mm)</TableHead>
                <TableHead className="w-20 text-center">Aantal</TableHead>
                <TableHead>Notities</TableHead>
                {canManageProjects && <TableHead className="w-24 text-right">Acties</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {posnummers.map((posnummer) => (
                <TableRow key={posnummer.id}>
                  <TableCell className="font-mono font-medium">{posnummer.posnr}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{posnummer.materiaal}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {posnummer.profiel || '-'}
                  </TableCell>
                  <TableCell className="text-sm font-mono">{formatDimensions(posnummer)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{posnummer.quantity}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {posnummer.notes || '-'}
                  </TableCell>
                  {canManageProjects && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {onEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(posnummer)}
                            title="Bewerken"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(posnummer)}
                          disabled={deleteMutation.isPending}
                          title="Verwijderen"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Summary */}
      {posnummers && posnummers.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {posnummers.length} posnummer{posnummers.length !== 1 ? 's' : ''} gevonden
        </p>
      )}
    </div>
  )
}
