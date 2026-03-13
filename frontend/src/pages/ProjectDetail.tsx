/**
 * ProjectDetail Page
 * Phase 1.1: Projects and Fases
 *
 * Detail page for a single project with fases
 */

import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { FaseCard } from '../components/FaseCard'
import { CreateFaseModal } from '../components/CreateFaseModal'
import { useProject, useDeleteProject } from '../hooks/useProjects'
import { usePermissions } from '../hooks/usePermissions'
import { ArrowLeft, Plus, Edit, Trash2, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

export function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { permissions } = usePermissions()

  const { data: project, isLoading } = useProject(projectId)
  const deleteProject = useDeleteProject()

  const [createFaseModalOpen, setCreateFaseModalOpen] = useState(false)

  const handleDelete = async () => {
    if (!projectId) return

    const confirmed = window.confirm(
      `Weet u zeker dat u project ${project?.code} wilt verwijderen?\n\nDit verwijdert ook alle fases en gerelateerde data.`
    )

    if (!confirmed) return

    try {
      await deleteProject.mutateAsync(projectId)
      navigate('/projecten')
    } catch (error) {
      // Error handled by mutation
    }
  }

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

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="h-8 bg-muted rounded animate-pulse w-48" />
          <div className="h-32 bg-muted rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-48 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </div>
      </Layout>
    )
  }

  if (!project) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">Project niet gevonden</p>
          <Button className="mt-4" onClick={() => navigate('/projecten')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Terug naar projecten
          </Button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center text-sm text-muted-foreground">
          <Link to="/projecten" className="hover:text-foreground">
            Projecten
          </Link>
          <ChevronRight className="h-4 w-4 mx-2" />
          <span className="text-foreground">{project.code}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold font-mono">{project.code}</h1>
              <Badge variant="outline" className={getStatusColor(project.status)}>
                {getStatusLabel(project.status)}
              </Badge>
            </div>
            <h2 className="text-2xl text-muted-foreground">{project.naam}</h2>
          </div>

          <div className="flex items-center gap-2">
            {permissions.canEditProjects && (
              <Button variant="outline" onClick={() => toast.info('Edit functie komt binnenkort')}>
                <Edit className="mr-2 h-4 w-4" />
                Bewerken
              </Button>
            )}

            {permissions.canDeleteProjects && (
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={deleteProject.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {deleteProject.isPending ? 'Verwijderen...' : 'Verwijderen'}
              </Button>
            )}
          </div>
        </div>

        {/* Project Info */}
        <Card>
          <CardHeader>
            <CardTitle>Project Informatie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {project.beschrijving && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Beschrijving</p>
                <p className="text-sm">{project.beschrijving}</p>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Aantal Fases</p>
                <p className="text-2xl font-bold">{project.fase_count}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Aangemaakt</p>
                <p className="text-sm">
                  {new Date(project.created_at).toLocaleDateString('nl-NL', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Laatst bijgewerkt</p>
                <p className="text-sm">
                  {new Date(project.updated_at).toLocaleDateString('nl-NL', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Status</p>
                <Badge variant="outline" className={getStatusColor(project.status)}>
                  {getStatusLabel(project.status)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fases Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Fases</h2>
            {permissions.canCreateProjects && (
              <Button onClick={() => setCreateFaseModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nieuwe Fase
              </Button>
            )}
          </div>

          {project.fases && project.fases.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {project.fases.map((fase) => (
                <FaseCard
                  key={fase.id}
                  fase={fase}
                  onClick={() => navigate(`/projecten/${project.id}/fases/${fase.id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground mb-4">Nog geen fases aangemaakt</p>
              {permissions.canCreateProjects && (
                <Button onClick={() => setCreateFaseModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Maak eerste fase
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Fase Modal */}
      {projectId && (
        <CreateFaseModal
          open={createFaseModalOpen}
          onClose={() => setCreateFaseModalOpen(false)}
          projectId={projectId}
        />
      )}
    </Layout>
  )
}
