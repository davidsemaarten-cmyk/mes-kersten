/**
 * OrderPosnummerDialog — Dialog to link/unlink posnummers to an order
 *
 * Shows all available posnummers in the fase and lets the user
 * check/uncheck which ones are linked to this order.
 */

import { useState, useEffect } from 'react'
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, DialogFooter,
} from './ui/dialog'
import { Button } from './ui/button'
import { Checkbox } from './ui/checkbox'
import { Badge } from './ui/badge'
import { Loader2, Link2 } from 'lucide-react'
import { usePosnummers } from '../hooks/usePosnummers'
import { useOrder, useLinkPosnummers, useUnlinkPosnummers } from '../hooks/useOrders'
import { toast } from 'sonner'

interface OrderPosnummerDialogProps {
  orderId: string
  orderTypeName: string
  faseId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OrderPosnummerDialog({
  orderId,
  orderTypeName,
  faseId,
  open,
  onOpenChange,
}: OrderPosnummerDialogProps) {
  const { data: posnummers, isLoading: isLoadingPosnummers } = usePosnummers(faseId)
  const { data: order, isLoading: isLoadingOrder } = useOrder(open ? orderId : undefined)

  const linkMutation = useLinkPosnummers(orderId, faseId)
  const unlinkMutation = useUnlinkPosnummers(orderId, faseId)

  // Track which posnummers are currently selected (checked)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Sync state when order data loads
  useEffect(() => {
    if (order?.posnummers) {
      setSelected(new Set(order.posnummers.map((p) => p.id)))
    }
  }, [order])

  const isLoading = isLoadingPosnummers || isLoadingOrder
  const isMutating = linkMutation.isPending || unlinkMutation.isPending

  const togglePosnummer = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const linkedIds = new Set(order?.posnummers?.map((p) => p.id) ?? [])

  const handleSave = async () => {
    // Determine diff
    const toLink = [...selected].filter((id) => !linkedIds.has(id))
    const toUnlink = [...linkedIds].filter((id) => !selected.has(id))

    try {
      if (toLink.length > 0) {
        await linkMutation.mutateAsync({ posnummer_ids: toLink })
      }
      if (toUnlink.length > 0) {
        await unlinkMutation.mutateAsync({ posnummer_ids: toUnlink })
      }

      if (toLink.length === 0 && toUnlink.length === 0) {
        toast.info('Geen wijzigingen')
      } else {
        toast.success('Posnummers bijgewerkt')
      }
      onOpenChange(false)
    } catch (error: any) {
      const message = error?.response?.data?.detail || 'Fout bij bijwerken posnummers'
      toast.error(message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Posnummers koppelen
          </DialogTitle>
          <DialogDescription>
            Selecteer welke posnummers gekoppeld zijn aan order "{orderTypeName}"
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-2">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !posnummers || posnummers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Geen posnummers gevonden in deze fase
            </p>
          ) : (
            <div className="space-y-1">
              {posnummers.map((posnummer) => {
                const isChecked = selected.has(posnummer.id)
                return (
                  <label
                    key={posnummer.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => togglePosnummer(posnummer.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-medium text-sm">
                          {posnummer.posnr}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {posnummer.materiaal}
                        </Badge>
                        {posnummer.quantity > 1 && (
                          <Badge variant="secondary" className="text-xs">
                            ×{posnummer.quantity}
                          </Badge>
                        )}
                      </div>
                      {(posnummer.profiel || posnummer.dimensions_display) && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {posnummer.profiel || posnummer.dimensions_display}
                        </p>
                      )}
                    </div>
                  </label>
                )
              })}
            </div>
          )}
        </div>

        <DialogFooter className="pt-4 border-t">
          <div className="flex items-center gap-2 mr-auto text-sm text-muted-foreground">
            {selected.size} geselecteerd
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button onClick={handleSave} disabled={isMutating || isLoading}>
            {isMutating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Opslaan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
