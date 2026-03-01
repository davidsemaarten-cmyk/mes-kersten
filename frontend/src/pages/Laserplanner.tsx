import { useState, useMemo } from 'react'
import Layout from '../components/Layout'
import { useLaserJobs, useDeleteJob } from '../hooks/useLaserplanner'
import { Button } from '../components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog'
import { Plus, Loader2, FileText, Trash2 } from 'lucide-react'
import { LaserJob, LaserJobStatus } from '../types/database'
import { CreateJobModal } from '../components/CreateJobModal'
import { useNavigate } from 'react-router-dom'

export function Laserplanner() {
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<LaserJobStatus | 'alle'>('alle')
  const [jobToDelete, setJobToDelete] = useState<LaserJob | null>(null)

  const { data: jobs, isLoading } = useLaserJobs(
    statusFilter === 'alle' ? undefined : statusFilter
  )
  const deleteJob = useDeleteJob()
  const navigate = useNavigate()

  const statusCounts = useMemo(() => {
    if (!jobs) return {}
    return jobs.reduce((acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }, [jobs])

  const getStatusBadgeVariant = (status: LaserJobStatus) => {
    switch (status) {
      case 'aangemaakt': return 'secondary'
      case 'geprogrammeerd': return 'default'
      case 'nc_verzonden': return 'default'
      case 'gereed': return 'outline'
      default: return 'secondary'
    }
  }

  const getStatusLabel = (status: LaserJobStatus) => {
    switch (status) {
      case 'aangemaakt': return 'Aangemaakt'
      case 'geprogrammeerd': return 'Geprogrammeerd'
      case 'nc_verzonden': return 'NC verzonden'
      case 'gereed': return 'Gereed'
      default: return status
    }
  }

  const handleDeleteConfirm = () => {
    if (!jobToDelete) return
    deleteJob.mutate(jobToDelete.id, {
      onSettled: () => setJobToDelete(null),
    })
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Laserplanner</h1>
            <p className="text-muted-foreground">
              Beheer laserjobs en materiaallijsten
            </p>
          </div>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nieuwe Job
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="alle">
              Alle ({jobs?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="aangemaakt">
              Aangemaakt ({statusCounts['aangemaakt'] || 0})
            </TabsTrigger>
            <TabsTrigger value="geprogrammeerd">
              Geprogrammeerd ({statusCounts['geprogrammeerd'] || 0})
            </TabsTrigger>
            <TabsTrigger value="nc_verzonden">
              NC verzonden ({statusCounts['nc_verzonden'] || 0})
            </TabsTrigger>
            <TabsTrigger value="gereed">
              Gereed ({statusCounts['gereed'] || 0})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Job List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : jobs && jobs.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <Card
                key={job.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/laserplanner/${job.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg leading-tight">{job.naam}</CardTitle>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant={getStatusBadgeVariant(job.status)}>
                        {getStatusLabel(job.status)}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          setJobToDelete(job)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {job.beschrijving && (
                    <CardDescription>{job.beschrijving}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>{job.line_item_count} regels</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Geen jobs gevonden</p>
              <p className="text-sm text-muted-foreground mb-4">
                Maak een nieuwe job aan om te beginnen
              </p>
              <Button onClick={() => setCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nieuwe Job
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <CreateJobModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!jobToDelete} onOpenChange={(open) => !open && setJobToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Laserjob verwijderen</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je de laserjob <strong>"{jobToDelete?.naam}"</strong> wilt verwijderen?
              Deze actie kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
              disabled={deleteJob.isPending}
            >
              {deleteJob.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  )
}
