/**
 * NaarLaserButton Component
 * Phase 7: Inline button for moving plates to laser
 *
 * Quick action button in Voorraad table to move plates to laser status
 */

import { useState } from 'react'
import { Button } from './ui/button'
import { Zap } from 'lucide-react'
import { useMoveToLaser } from '../hooks/usePlateStock'
import type { PlateWithRelations } from '../types/database'

interface NaarLaserButtonProps {
  plate: PlateWithRelations
}

export function NaarLaserButton({ plate }: NaarLaserButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const moveToLaser = useMoveToLaser()

  // Don't show button if plate is already at laser
  if (plate.status === 'bij_laser') {
    return null
  }

  const handleMoveToLaser = async (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent row click event
    setIsLoading(true)

    try {
      await moveToLaser.mutateAsync(plate.id)
    } catch (error) {
      // Error handled by mutation
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleMoveToLaser}
      disabled={isLoading || moveToLaser.isPending}
      className="text-orange-600 border-orange-200 hover:bg-orange-50"
    >
      <Zap className="h-3 w-3 mr-1" />
      Naar Laser
    </Button>
  )
}
