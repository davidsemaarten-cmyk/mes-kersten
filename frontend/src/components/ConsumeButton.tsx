/**
 * ConsumeButton Component
 * Phase 8: Laser workflow - Mark plate as consumed
 *
 * Inline button with confirmation dialog for consuming plates
 */

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from './ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog'
import { Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import type { PlateWithRelations } from '../types/database'

interface ConsumeButtonProps {
  plate: PlateWithRelations
}

export function ConsumeButton({ plate }: ConsumeButtonProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const queryClient = useQueryClient()

  const handleConsume = async () => {
    setIsLoading(true)
    try {
      await api.post(`/api/platestock/plates/${plate.id}/consume`)

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['plates'] })
      queryClient.invalidateQueries({ queryKey: ['plate', plate.id] })

      toast.success(`Plaat ${plate.plate_number} geregistreerd als verbruikt`)
      setOpen(false)
    } catch (error: any) {
      console.error('Error consuming plate:', error)
      toast.error(error.response?.data?.detail || 'Fout bij consumeren plaat')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={isLoading}
        className="text-red-600 border-red-200 hover:bg-red-50"
      >
        <Trash2 className="h-3 w-3 mr-1" />
        Verbruikt
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Plaat verbruikt registreren?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat plaat <strong>{plate.plate_number}</strong> volledig verbruikt is?
              <br />
              <span className="text-red-600 font-medium mt-2 block">
                Deze actie kan niet ongedaan worden.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConsume}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? 'Bezig...' : 'Ja, registreer als verbruikt'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
