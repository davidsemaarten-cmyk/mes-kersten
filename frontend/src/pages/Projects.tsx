/**
 * Projects Page
 * Phase 1.1: Projects and Fases
 *
 * Overview page showing all projects with filters and search
 */

import { useState } from 'react'
import { Layout } from '../components/Layout'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { ProjectCard } from '../components/ProjectCard'
import { CreateProjectModal } from '../components/CreateProjectModal'
import { useProjects } from '../hooks/useProjects'
import { usePermissions } from '../hooks/usePermissions'
import { Plus, Search } from 'lucide-react'

export function Projects() {
  const { permissions } = usePermissions()
  const [statusFilter, setStatusFilter] = useState<string>('alle')
  const [searchQuery, setSearchQuery] = useState('')
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const { data: projects, isLoading } = useProjects({
    status: statusFilter === 'alle' ? undefined : statusFilter,
    search: searchQuery || undefined,
  })

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Projecten</h1>
            <p className="text-sm text-gray-600 mt-1">Beheer en bekijk alle projecten</p>
          </div>

          {permissions.canCreateProjects && (
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nieuw Project
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoek op code of naam..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Alle statussen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle statussen</SelectItem>
              <SelectItem value="actief">Actief</SelectItem>
              <SelectItem value="afgerond">Afgerond</SelectItem>
              <SelectItem value="geannuleerd">Geannuleerd</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : projects && projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-muted-foreground mb-4">
              <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Geen projecten gevonden</p>
              <p className="text-sm mt-1">
                {searchQuery || (statusFilter && statusFilter !== 'alle')
                  ? 'Probeer andere filters of zoektermen'
                  : 'Begin met het aanmaken van een project'}
              </p>
            </div>
            {permissions.canCreateProjects && !searchQuery && (!statusFilter || statusFilter === 'alle') && (
              <Button onClick={() => setCreateModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Maak uw eerste project
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal open={createModalOpen} onClose={() => setCreateModalOpen(false)} />
    </Layout>
  )
}

// Import Package icon
import { Package } from 'lucide-react'
