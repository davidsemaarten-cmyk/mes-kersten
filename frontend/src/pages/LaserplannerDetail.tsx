import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useLaserJob, useUpdateJobStatus } from '../hooks/useLaserplanner'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { ArrowLeft, Loader2, Upload } from 'lucide-react'
import { LaserJobStatus } from '../types/database'
import { UploadCSVModal } from '../components/UploadCSVModal'

export function LaserplannerDetail() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const { data: job, isLoading } = useLaserJob(jobId)
  const updateStatus = useUpdateJobStatus()
  const [uploadModalOpen, setUploadModalOpen] = useState(false)

  const handleStatusChange = (newStatus: string) => {
    if (!jobId) return
    updateStatus.mutate({ jobId, status: newStatus })
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

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    )
  }

  if (!job) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-lg">Job niet gevonden</p>
          <Button onClick={() => navigate('/laserplanner')} className="mt-4">
            Terug naar overzicht
          </Button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/laserplanner')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{job.naam}</h1>
              {job.beschrijving && (
                <p className="text-muted-foreground">{job.beschrijving}</p>
              )}
            </div>
          </div>

          {job.line_item_count === 0 && (
            <Button onClick={() => setUploadModalOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload CSV
            </Button>
          )}
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
            <CardDescription>Huidige status van de laserjob</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={job.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aangemaakt">Aangemaakt</SelectItem>
                <SelectItem value="geprogrammeerd">Geprogrammeerd</SelectItem>
                <SelectItem value="nc_verzonden">NC verzonden</SelectItem>
                <SelectItem value="gereed">Gereed</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Line Items */}
        {job.line_items && job.line_items.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Materiaallijst ({job.line_items.length} regels)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rij</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Fase</TableHead>
                      <TableHead>Pos</TableHead>
                      <TableHead>Profiel</TableHead>
                      <TableHead>Aantal</TableHead>
                      <TableHead>Lengte</TableHead>
                      <TableHead>Kwaliteit</TableHead>
                      <TableHead>Gewicht</TableHead>
                      <TableHead>Zaag</TableHead>
                      <TableHead>Opmerkingen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {job.line_items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.row_number}</TableCell>
                        <TableCell>{item.projectcode}</TableCell>
                        <TableCell>{item.fasenr}</TableCell>
                        <TableCell>{item.posnr}</TableCell>
                        <TableCell>{item.profiel}</TableCell>
                        <TableCell>{item.aantal}</TableCell>
                        <TableCell>{item.lengte}</TableCell>
                        <TableCell>{item.kwaliteit}</TableCell>
                        <TableCell>{item.gewicht}</TableCell>
                        <TableCell>{item.zaag}</TableCell>
                        <TableCell>{item.opmerkingen}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-lg font-medium mb-2">Nog geen materiaallijst</p>
              <p className="text-sm text-muted-foreground mb-4">
                Upload een CSV bestand om te beginnen
              </p>
              <Button onClick={() => setUploadModalOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload CSV
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <UploadCSVModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        jobId={job.id}
      />
    </Layout>
  )
}
