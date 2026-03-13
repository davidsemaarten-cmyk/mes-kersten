import { useState, useMemo } from 'react'
import { Layout } from '../components/Layout'
import { useLaserJobs, useDeleteJob } from '../hooks/useLaserplanner'
import { Button } from '../components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Card, CardContent } from '../components/ui/card'
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
import { Plus, Loader2, FileText, Trash2, ArrowRight, Calendar, Hash } from 'lucide-react'
import { LaserJob, LaserJobStatus } from '../types/database'
import { CreateJobModal } from '../components/CreateJobModal'
import { useNavigate } from 'react-router-dom'

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'vandaag'
  if (diffDays === 1) return 'gisteren'
  if (diffDays < 7) return `${diffDays} dagen geleden`
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return `${weeks} ${weeks === 1 ? 'week' : 'weken'} geleden`
  }
  return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

export function Laserplanner() {
  // 1. Lokale UI state
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<LaserJobStatus | 'alle'>('alle')
  const [jobToDelete, setJobToDelete] = useState<LaserJob | null>(null)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)

  // 2. Data hooks
  const { data: jobs, isLoading } = useLaserJobs(
    statusFilter === 'alle' ? undefined : statusFilter
  )
  const deleteJob = useDeleteJob()
  const navigate = useNavigate()

  // 3. Computed values
  const statusCounts = useMemo(() => {
    if (!jobs) return {}
    return jobs.reduce((acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }, [jobs])

  const selectedJob = useMemo(() => {
    if (!selectedJobId || !jobs) return null
    return jobs.find(j => j.id === selectedJobId) || null
  }, [selectedJobId, jobs])

  // 4. Helper functions
  const getStatusBadge = (status: LaserJobStatus) => {
    switch (status) {
      case 'concept':
        return { variant: 'outline' as const, className: 'border-gray-200 bg-gray-50 text-gray-700' }
      case 'gereed_voor_almacam':
        return { variant: 'outline' as const, className: 'border-blue-200 bg-blue-50 text-blue-700' }
      case 'geexporteerd':
        return { variant: 'outline' as const, className: 'border-green-200 bg-green-50 text-green-700' }
      default:
        return { variant: 'outline' as const, className: 'border-gray-200 bg-gray-50 text-gray-700' }
    }
  }

  const getStatusLabel = (status: LaserJobStatus) => {
    switch (status) {
      case 'concept':             return 'Concept'
      case 'gereed_voor_almacam': return 'Gereed voor Almacam'
      case 'geexporteerd':        return 'Geexporteerd'
      default:                    return status
    }
  }

  // 5. Event handlers
  const handleDeleteConfirm = () => {
    if (!jobToDelete) return
    const deletingSelectedJob = jobToDelete.id === selectedJobId
    deleteJob.mutate(jobToDelete.id, {
      onSettled: () => {
        setJobToDelete(null)
        if (deletingSelectedJob) setSelectedJobId(null)
      },
    })
  }

  const handleSelectJob = (job: LaserJob) => {
    setSelectedJobId(job.id === selectedJobId ? null : job.id)
  }

  // 6. JSX
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Laserplanner</h1>
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
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as LaserJobStatus | 'alle')}>
          <TabsList>
            <TabsTrigger value="alle">
              Alle ({jobs?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="concept">
              Concept ({statusCounts['concept'] || 0})
            </TabsTrigger>
            <TabsTrigger value="gereed_voor_almacam">
              Gereed voor Almacam ({statusCounts['gereed_voor_almacam'] || 0})
            </TabsTrigger>
            <TabsTrigger value="geexporteerd">
              Geexporteerd ({statusCounts['geexporteerd'] || 0})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Split-pane layout */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : jobs && jobs.length > 0 ? (
          <div className="flex gap-6">
            {/* Left panel — Job list */}
            <div className="w-1/3 min-w-[280px] space-y-1">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className={`group flex items-center gap-3 px-3 h-14 rounded-md cursor-pointer transition-colors ${
                    job.id === selectedJobId
                      ? 'bg-accent'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => handleSelectJob(job)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">
                        {job.naam}
                      </span>
                      <Badge
                        variant={getStatusBadge(job.status).variant}
                        className={`${getStatusBadge(job.status).className} shrink-0 text-xs`}
                      >
                        {getStatusLabel(job.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span>{job.line_item_count} regels</span>
                      <span>{formatRelativeDate(job.created_at)}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation()
                      setJobToDelete(job)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Right panel — Detail */}
            <div className="flex-1 min-w-0">
              {selectedJob ? (
                <Card>
                  <CardContent className="p-6 space-y-6">
                    {/* Job title and status */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-semibold text-foreground">{selectedJob.naam}</h2>
                        {selectedJob.beschrijving && (
                          <p className="text-sm text-muted-foreground mt-1">{selectedJob.beschrijving}</p>
                        )}
                      </div>
                      <Badge
                        variant={getStatusBadge(selectedJob.status).variant}
                        className={getStatusBadge(selectedJob.status).className}
                      >
                        {getStatusLabel(selectedJob.status)}
                      </Badge>
                    </div>

                    {/* Properties */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-foreground">Eigenschappen</h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4 shrink-0" />
                          <span>Aangemaakt</span>
                        </div>
                        <span className="text-foreground">{formatRelativeDate(selectedJob.created_at)}</span>

                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Hash className="h-4 w-4 shrink-0" />
                          <span>Regels</span>
                        </div>
                        <span className="text-foreground">{selectedJob.line_item_count}</span>

                        {selectedJob.export_date && (
                          <>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-4 w-4 shrink-0" />
                              <span>Geexporteerd</span>
                            </div>
                            <span className="text-foreground">
                              {formatRelativeDate(selectedJob.export_date)}
                              {selectedJob.exported_by_name && (
                                <span className="text-muted-foreground"> door {selectedJob.exported_by_name}</span>
                              )}
                            </span>
                          </>
                        )}

                        {selectedJob.export_count > 0 && (
                          <>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <FileText className="h-4 w-4 shrink-0" />
                              <span>Exports</span>
                            </div>
                            <span className="text-foreground">{selectedJob.export_count}x</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Action button */}
                    <div className="pt-2">
                      <Button
                        variant="outline"
                        onClick={() => navigate(`/laserplanner/${selectedJob.id}`)}
                      >
                        Open volledige details
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <FileText className="h-10 w-10 mb-3 opacity-40" />
                  <p className="text-sm">Selecteer een job om de details te bekijken</p>
                </div>
              )}
            </div>
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
