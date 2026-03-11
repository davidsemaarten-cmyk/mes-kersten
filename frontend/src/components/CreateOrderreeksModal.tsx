/**
 * Modal for creating a new orderreeks (order sequence)
 * Allows selection of order types to include in the sequence
 */

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ArrowRight } from 'lucide-react'
import { useOrderTypes, useCreateOrderreeks } from '@/hooks/useOrders'
import { toast } from 'sonner'
import type { OrderreeksCreate } from '@/types/database'

interface CreateOrderreeksModalProps {
  faseId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateOrderreeksModal({ faseId, open, onOpenChange }: CreateOrderreeksModalProps) {
  const [title, setTitle] = useState('Volledig')
  const [selectedOrderTypeIds, setSelectedOrderTypeIds] = useState<string[]>([])

  const { data: orderTypes, isLoading: isLoadingTypes } = useOrderTypes()
  const createMutation = useCreateOrderreeks(faseId)

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setTitle('Volledig')
      setSelectedOrderTypeIds([])
    }
  }, [open])

  const handleToggleOrderType = (orderTypeId: string) => {
    setSelectedOrderTypeIds((prev) =>
      prev.includes(orderTypeId)
        ? prev.filter((id) => id !== orderTypeId)
        : [...prev, orderTypeId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!title.trim()) {
      toast.error('Titel is verplicht')
      return
    }
    if (/[<>]/.test(title)) {
      toast.error('Titel mag geen HTML-tekens bevatten')
      return
    }

    if (selectedOrderTypeIds.length === 0) {
      toast.error('Selecteer minimaal één bewerkingstype')
      return
    }

    const data: OrderreeksCreate = {
      fase_id: faseId,
      title: title.trim(),
      order_type_ids: selectedOrderTypeIds,
    }

    try {
      await createMutation.mutateAsync(data)
      toast.success(`Orderreeks "${title}" aangemaakt met ${selectedOrderTypeIds.length} orders`)
      onOpenChange(false)
    } catch (error: any) {
      const message = error?.response?.data?.detail || 'Fout bij aanmaken orderreeks'
      toast.error(message)
    }
  }

  // Get selected order types in order for preview
  const selectedOrderTypes = orderTypes?.filter((ot) => selectedOrderTypeIds.includes(ot.id)) || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nieuwe Orderreeks</DialogTitle>
          <DialogDescription>Maak een orderreeks aan met de gewenste ordertypes.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Titel <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="bijv. Volledig, West, Oost"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <p className="text-sm text-muted-foreground">
              Gebruik "Volledig" voor alle onderdelen, of "West"/"Oost" bij splitsing
            </p>
          </div>

          {/* Order Types Selection */}
          <div className="space-y-3">
            <Label>
              Selecteer bewerkingen <span className="text-red-500">*</span>
            </Label>

            {isLoadingTypes ? (
              <p className="text-sm text-muted-foreground">Laden...</p>
            ) : (
              <div className="space-y-2 border rounded-lg p-4">
                {orderTypes?.map((orderType) => (
                  <div key={orderType.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={orderType.id}
                      checked={selectedOrderTypeIds.includes(orderType.id)}
                      onCheckedChange={() => handleToggleOrderType(orderType.id)}
                    />
                    <Label
                      htmlFor={orderType.id}
                      className="flex-1 cursor-pointer flex items-center gap-2"
                    >
                      <span>{orderType.name}</span>
                      {selectedOrderTypeIds.includes(orderType.id) && (
                        <Badge variant="secondary" className="text-xs">
                          {selectedOrderTypeIds.indexOf(orderType.id) + 1}
                        </Badge>
                      )}
                    </Label>
                  </div>
                ))}
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              De volgorde van de orders wordt bepaald door de volgorde waarin je ze selecteert
            </p>
          </div>

          {/* Preview */}
          {selectedOrderTypes.length > 0 && (
            <div className="space-y-2">
              <Label>Voorbeeld orderreeks:</Label>
              <div className="flex items-center gap-2 flex-wrap p-4 bg-muted rounded-lg">
                {selectedOrderTypes.map((orderType, index) => (
                  <div key={orderType.id} className="flex items-center gap-2">
                    <Badge variant="outline" className="text-sm">
                      {index + 1}. {orderType.name}
                    </Badge>
                    {index < selectedOrderTypes.length - 1 && (
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button type="submit" disabled={createMutation.isPending || selectedOrderTypeIds.length === 0}>
              {createMutation.isPending ? 'Aanmaken...' : 'Aanmaken'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
