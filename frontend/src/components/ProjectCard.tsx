/**
 * ProjectCard Component
 * Phase 1.1: Projects and Fases
 *
 * Card display for project in grid view
 */

import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import type { Project } from '../hooks/useProjects'
import { formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale'

interface ProjectCardProps {
  project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'actief':
        return 'bg-green-50 border-green-200 text-green-700'
      case 'afgerond':
        return 'bg-blue-50 border-blue-200 text-blue-700'
      case 'geannuleerd':
        return 'bg-muted border-border text-muted-foreground'
      default:
        return 'bg-muted border-border text-muted-foreground'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'actief':
        return 'Actief'
      case 'afgerond':
        return 'Afgerond'
      case 'geannuleerd':
        return 'Geannuleerd'
      default:
        return status
    }
  }

  const formatLastUpdated = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return formatDistanceToNow(date, { addSuffix: true, locale: nl })
    } catch {
      return 'Onbekend'
    }
  }

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => navigate(`/projecten/${project.id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-2xl font-bold font-mono">{project.code}</h3>
            <p className="text-lg font-medium text-foreground mt-1">{project.naam}</p>
          </div>
          <Badge variant="outline" className={getStatusColor(project.status)}>{getStatusLabel(project.status)}</Badge>
        </div>
      </CardHeader>

      <CardContent>
        {project.beschrijving && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {project.beschrijving}
          </p>
        )}

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {project.fase_count} {project.fase_count === 1 ? 'fase' : 'fases'}
          </span>
          <span>{formatLastUpdated(project.updated_at)}</span>
        </div>
      </CardContent>
    </Card>
  )
}
