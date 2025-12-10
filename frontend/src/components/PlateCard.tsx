/**
 * PlateCard component
 * Displays a single plate with color coding and status
 */

import { Card, CardContent, CardHeader } from './ui/card'
import { Badge } from './ui/badge'
import type { PlateWithRelations } from '../types/database'

interface PlateCardProps {
  plate: PlateWithRelations
  onClick?: () => void
}

export function PlateCard({ plate, onClick }: PlateCardProps) {
  const calculateArea = () => {
    return ((plate.width * plate.length) / 1_000_000).toFixed(2)
  }

  const getStatusBadge = () => {
    switch (plate.status) {
      case 'beschikbaar':
        return <Badge variant="default" className="bg-green-500">Beschikbaar</Badge>
      case 'geclaimd':
        return <Badge variant="default" className="bg-blue-500">Geclaimd</Badge>
      case 'bij_laser':
        return <Badge variant="default" className="bg-orange-500">Bij Laser</Badge>
      default:
        return null
    }
  }

  const activeClaimsCount = plate.claims?.filter(c => c.actief).length || 0

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
      style={{
        borderLeft: `4px solid ${plate.material?.kleur || '#gray'}`
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{plate.plate_number}</h3>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Materiaal:</span>
            <span className="font-medium">
              {plate.material 
                ? `${plate.material.materiaalgroep}${plate.material.specificatie ? ' ' + plate.material.specificatie : ''} ${plate.material.oppervlaktebewerking}`
                : plate.material_prefix}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Kwaliteit:</span>
            <span className="font-medium">{plate.quality}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Afmeting:</span>
            <span className="font-medium">
              {plate.width} × {plate.length} × {plate.thickness} mm
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Oppervlakte:</span>
            <span className="font-medium">{calculateArea()} m²</span>
          </div>
          {plate.location && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Locatie:</span>
              <span className="font-medium">{plate.location}</span>
            </div>
          )}
          {activeClaimsCount > 0 && (
            <div className="flex justify-between mt-2 pt-2 border-t">
              <span className="text-muted-foreground">Claims:</span>
              <span className="font-medium text-blue-600">
                {activeClaimsCount} actief
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
