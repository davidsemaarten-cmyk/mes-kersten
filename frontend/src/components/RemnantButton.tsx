/**
 * RemnantButton Component
 * Phase 8: Laser workflow - Trigger remnant modal
 *
 * Button that opens the remnant processing modal
 */

import { useState } from 'react'
import { Button } from './ui/button'
import { Scissors } from 'lucide-react'
import { RemnantModal } from './RemnantModal'
import type { PlateWithRelations } from '../types/database'

interface RemnantButtonProps {
  plate: PlateWithRelations
}

export function RemnantButton({ plate }: RemnantButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-purple-600 border-purple-200 hover:bg-purple-50"
      >
        <Scissors className="h-3 w-3 mr-1" />
        Restant
      </Button>

      <RemnantModal
        plate={plate}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}
