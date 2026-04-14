/**
 * Card component for displaying an orderreeks with order flow visualization
 * Shows orders in sequence with status indicators and progress
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ArrowRight, CheckCircle2, Circle, Clock, Trash2, Link2 } from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'
import { useDeleteOrderreeks } from '@/hooks/useOrders'
import { toast } from 'sonner'
import { useState } from 'react'
import { OrderPosnummerDialog } from './OrderPosnummerDialog'
import type { OrderreeksResponse, OrderResponse } from '@/types/database'

interface OrderreeksCardProps {
  orderreeks: OrderreeksResponse
  faseId: string
  /** Pass faseId so the posnummer dialog can fetch fase's posnummers */
}

export function OrderreeksCard({ orderreeks, faseId }: OrderreeksCardProps) {
  const { permissions, canManageProjects } = usePermissions()
  const deleteMutation = useDeleteOrderreeks(faseId)
  const [linkDialogOrder, setLinkDialogOrder] = useState<{ id: string; typeName: string } | null>(null)

  const handleDelete = async () => {
    if (!confirm(`Weet je zeker dat je orderreeks "${orderreeks.title}" wilt verwijderen?`)) {
      return
    }

    try {
      await deleteMutation.mutateAsync(orderreeks.id)
      toast.success(`Orderreeks "${orderreeks.title}" verwijderd`)
    } catch (error: any) {
      const message = error?.response?.data?.detail || 'Fout bij verwijderen orderreeks'
      toast.error(message)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      open: 'secondary' as const,
      in_uitvoering: 'default' as const,
      afgerond: 'outline' as const,
    }

    const labels = {
      open: 'Open',
      in_uitvoering: 'In uitvoering',
      afgerond: 'Afgerond',
    }

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    )
  }

  const getOrderStatusIcon = (order: OrderResponse) => {
    switch (order.status) {
      case 'afgerond':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'in_uitvoering':
        return <Clock className="h-5 w-5 text-blue-600" />
      case 'blocked':
        return <Circle className="h-5 w-5 text-red-600" />
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />
    }
  }

  const getOrderStatusBadge = (order: OrderResponse) => {
    const variants = {
      open: 'outline' as const,
      in_uitvoering: 'default' as const,
      afgerond: 'secondary' as const,
      blocked: 'destructive' as const,
    }

    const labels = {
      open: 'Open',
      in_uitvoering: 'Actief',
      afgerond: 'Klaar',
      blocked: 'Geblokkeerd',
    }

    return (
      <Badge variant={variants[order.status as keyof typeof variants] || 'outline'} className="text-xs">
        {labels[order.status as keyof typeof labels] || order.status}
      </Badge>
    )
  }

  // Calculate progress
  const completedOrders = orderreeks.orders.filter((o) => o.status === 'afgerond').length
  const totalOrders = orderreeks.orders.length
  const progressPercentage = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0

  return (
    <>
      <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              {orderreeks.title}
              {getStatusBadge(orderreeks.status)}
            </CardTitle>
            {orderreeks.fase_code && (
              <p className="text-sm text-muted-foreground">Fase: {orderreeks.fase_code}</p>
            )}
          </div>

          {permissions.isAdmin && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              title="Verwijderen"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>

        {/* Progress */}
        <div className="space-y-1 pt-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {completedOrders} van {totalOrders} orders afgerond
            </span>
            <span className="font-medium">{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
      </CardHeader>

      <CardContent>
        {/* Order Flow Visualization */}
        {orderreeks.orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">Geen orders in deze reeks</p>
        ) : (
          <div className="space-y-4">
            {/* Horizontal timeline view for desktop */}
            <div className="hidden md:flex items-center gap-3 overflow-x-auto pb-2">
              {orderreeks.orders.map((order, index) => (
                <div key={order.id} className="flex items-center gap-3">
                  {/* Order card */}
                  <div className="flex flex-col items-center gap-2 min-w-[140px]">
                    <div className="flex items-center gap-2">
                      {getOrderStatusIcon(order)}
                      <span className="text-xs text-muted-foreground">#{order.sequence_position}</span>
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-sm">{order.order_type_name}</p>
                      {getOrderStatusBadge(order)}
                    </div>
                    {order.assigned_to_name && (
                      <p className="text-xs text-muted-foreground text-center">
                        {order.assigned_to_name}
                      </p>
                    )}
                    {order.posnummer_count > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {order.posnummer_count} delen
                      </Badge>
                    )}
                    {canManageProjects && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        title="Posnummers koppelen"
                        onClick={() =>
                          setLinkDialogOrder({ id: order.id, typeName: order.order_type_name })
                        }
                      >
                        <Link2 className="h-3 w-3 mr-1" />
                        Koppel
                      </Button>
                    )}
                  </div>

                  {/* Arrow between orders */}
                  {index < orderreeks.orders.length - 1 && (
                    <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>

            {/* Vertical list view for mobile */}
            <div className="md:hidden space-y-2">
              {orderreeks.orders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center gap-3 p-3 border rounded-lg"
                >
                  {getOrderStatusIcon(order)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">#{order.sequence_position}</span>
                      <p className="font-medium text-sm">{order.order_type_name}</p>
                    </div>
                    {order.assigned_to_name && (
                      <p className="text-xs text-muted-foreground">{order.assigned_to_name}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {getOrderStatusBadge(order)}
                    {order.posnummer_count > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {order.posnummer_count}
                      </Badge>
                    )}
                    {canManageProjects && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() =>
                          setLinkDialogOrder({ id: order.id, typeName: order.order_type_name })
                        }
                      >
                        <Link2 className="h-3 w-3 mr-1" />
                        Koppel
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      </Card>

    {/* Posnummer link dialog */}
    {linkDialogOrder && (
      <OrderPosnummerDialog
        orderId={linkDialogOrder.id}
        orderTypeName={linkDialogOrder.typeName}
        faseId={faseId}
        open={!!linkDialogOrder}
        onOpenChange={(open) => !open && setLinkDialogOrder(null)}
      />
    )}
    </>
  )
}
