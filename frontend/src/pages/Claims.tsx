/**
 * Claims Page
 * View and manage all plate claims
 */

import { useState, useMemo } from 'react'
import Layout from '../components/Layout'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { useClaims, useReleaseClaim, useReleaseByProject } from '../hooks/usePlateStock'
import type { ClaimWithPlate } from '../types/database'
import { Loader2, X, Package, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

export function Claims() {
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'released'>('active')
  const [searchQuery, setSearchQuery] = useState('')

  const { data: claims, isLoading } = useClaims()
  const releaseClaim = useReleaseClaim()
  const releaseByProject = useReleaseByProject()

  // Filter claims
  const filteredClaims = useMemo(() => {
    if (!claims) return []

    let filtered = claims

    // Filter by status
    if (filterStatus === 'active') {
      filtered = filtered.filter(c => c.actief)
    } else if (filterStatus === 'released') {
      filtered = filtered.filter(c => !c.actief)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(claim => {
        return (
          claim.project_naam.toLowerCase().includes(query) ||
          claim.project_fase.toLowerCase().includes(query) ||
          claim.plate?.plate_number.toLowerCase().includes(query)
        )
      })
    }

    return filtered
  }, [claims, filterStatus, searchQuery])

  // Group claims by project
  const projectGroups = useMemo(() => {
    const groups = new Map<string, ClaimWithPlate[]>()

    filteredClaims.forEach(claim => {
      const key = `${claim.project_naam}-${claim.project_fase}`
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(claim)
    })

    return Array.from(groups.entries()).map(([key, claims]) => {
      const totalM2 = claims.reduce((total, claim) => {
        if (claim.m2_geclaimd) {
          return total + parseFloat(claim.m2_geclaimd.toString())
        } else if (claim.plate) {
          return total + ((claim.plate.width * claim.plate.length) / 1_000_000)
        }
        return total
      }, 0)

      return {
        key,
        project_naam: claims[0].project_naam,
        project_fase: claims[0].project_fase,
        claims,
        totalM2: totalM2.toFixed(2),
        activeCount: claims.filter(c => c.actief).length
      }
    }).sort((a, b) => {
      // Sort by project name, then fase
      if (a.project_naam !== b.project_naam) {
        return a.project_naam.localeCompare(b.project_naam)
      }
      return a.project_fase.localeCompare(b.project_fase)
    })
  }, [filteredClaims])

  const handleReleaseClaim = async (claimId: string) => {
    if (confirm('Deze claim vrijgeven?')) {
      try {
        await releaseClaim.mutateAsync(claimId)
      } catch (error) {
        // Error handled by mutation
      }
    }
  }

  const handleReleaseProject = async (projectNaam: string, projectFase: string) => {
    if (confirm(`Alle claims voor ${projectNaam} - ${projectFase} vrijgeven?`)) {
      try {
        const result = await releaseByProject.mutateAsync({
          project_naam: projectNaam,
          project_fase: projectFase
        })
        toast.success(
          `${result.claims_released} claims vrijgegeven, ${result.plates_freed} platen vrijgekomen`
        )
      } catch (error) {
        // Error handled by mutation
      }
    }
  }

  const activeClaims = claims?.filter(c => c.actief) || []
  const totalActiveM2 = activeClaims.reduce((total, claim) => {
    if (claim.m2_geclaimd) {
      return total + parseFloat(claim.m2_geclaimd.toString())
    } else if (claim.plate) {
      return total + ((claim.plate.width * claim.plate.length) / 1_000_000)
    }
    return total
  }, 0)

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Claims</h1>
          <p className="text-sm text-gray-600 mt-1">
            {claims ? `${activeClaims.length} actieve claims` : 'Laden...'}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Actieve Claims
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeClaims.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Totaal Geclaimd
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActiveM2.toFixed(2)} m²</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Actieve Projecten
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {projectGroups.filter(g => g.activeCount > 0).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Zoeken</Label>
              <Input
                id="search"
                placeholder="Zoek op project, fase, plaatnummer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="w-full md:w-48">
              <Label htmlFor="status">Status</Label>
              <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  <SelectItem value="active">Actief</SelectItem>
                  <SelectItem value="released">Vrijgegeven</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-sm text-gray-600">Claims laden...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredClaims.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-gray-900">Geen claims gevonden</h3>
            <p className="text-sm text-gray-600">
              {searchQuery
                ? 'Probeer een andere zoekopdracht'
                : filterStatus === 'active'
                ? 'Er zijn momenteel geen actieve claims'
                : 'Er zijn geen claims'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Claims by Project */}
      {!isLoading && projectGroups.length > 0 && (
        <div className="space-y-4">
          {projectGroups.map(group => (
            <Card key={group.key}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {group.project_naam} - {group.project_fase}
                      {group.activeCount > 0 && (
                        <Badge>{group.activeCount} actief</Badge>
                      )}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {group.claims.length} claim{group.claims.length !== 1 ? 's' : ''} • {group.totalM2} m²
                    </p>
                  </div>

                  {group.activeCount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReleaseProject(group.project_naam, group.project_fase)}
                      disabled={releaseByProject.isPending}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Alles Vrijgeven
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plaatnummer</TableHead>
                      <TableHead>Materiaal</TableHead>
                      <TableHead>M² Geclaimd</TableHead>
                      <TableHead>Datum</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.claims.map(claim => {
                      const plateArea = claim.plate
                        ? ((claim.plate.width * claim.plate.length) / 1_000_000).toFixed(2)
                        : '0.00'

                      return (
                        <TableRow key={claim.id}>
                          <TableCell className="font-medium">
                            {claim.plate?.plate_number || 'Onbekend'}
                          </TableCell>
                          <TableCell>
                            {claim.plate?.material?.naam || claim.plate?.material_prefix || '-'}
                          </TableCell>
                          <TableCell>
                            {claim.m2_geclaimd
                              ? `${claim.m2_geclaimd} m²`
                              : `${plateArea} m² (volledig)`}
                          </TableCell>
                          <TableCell>
                            {new Date(claim.claimed_at).toLocaleDateString('nl-NL')}
                          </TableCell>
                          <TableCell>
                            <Badge variant={claim.actief ? 'default' : 'outline'}>
                              {claim.actief ? 'Actief' : 'Vrijgegeven'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {claim.actief && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReleaseClaim(claim.id)}
                                disabled={releaseClaim.isPending}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>

                {group.claims.some(c => c.notes) && (
                  <div className="mt-4 p-3 bg-muted rounded-md">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="space-y-1 text-sm">
                        {group.claims
                          .filter(c => c.notes)
                          .map(claim => (
                            <p key={claim.id}>
                              <span className="font-medium">{claim.plate?.plate_number}:</span>{' '}
                              {claim.notes}
                            </p>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>
    </Layout>
  )
}
