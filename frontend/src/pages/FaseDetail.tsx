/**
 * FaseDetail Page
 * Phase 1.2: Complete fase management with orders, posnummers, and statistics
 *
 * Tabs:
 * - Overzicht: Statistics and summary
 * - Bestanden: File management (Phase 2)
 * - Posnummers: Part number management
 * - Orders: Orderreeksen and orders
 * - Materiaal: Material claims (Phase 5)
 */

import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Badge } from '../components/ui/badge'
import { useFase, useFaseStatistics } from '../hooks/useProjects'
import { useOrderreeksen } from '../hooks/useOrders'
import { usePosnummers } from '../hooks/usePosnummers'
import { usePermissions } from '../hooks/usePermissions'
import { CreatePosnummerModal } from '../components/CreatePosnummerModal'
import { PosnummerTable } from '../components/PosnummerTable'
import { CreateOrderreeksModal } from '../components/CreateOrderreeksModal'
import { OrderreeksCard } from '../components/OrderreeksCard'
import {
  ArrowLeft,
  ChevronRight,
  FileText,
  Package,
  ListOrdered,
  Layers,
  BarChart3,
  Plus,
} from 'lucide-react'

export function FaseDetail() {
  const { projectId, faseId } = useParams<{ projectId: string; faseId: string }>()
  const navigate = useNavigate()
  const { permissions, canManageProjects } = usePermissions()

  const [activeTab, setActiveTab] = useState('overzicht')
  const [createPosnummerOpen, setCreatePosnummerOpen] = useState(false)
  const [createOrderreeksOpen, setCreateOrderreeksOpen] = useState(false)

  const { data: fase, isLoading: isLoadingFase } = useFase(faseId)
  const { data: statistics, isLoading: isLoadingStats } = useFaseStatistics(faseId)
  const { data: orderreeksen, isLoading: isLoadingOrderreeksen } = useOrderreeksen(faseId || '')
  const { data: posnummers, isLoading: isLoadingPosnummers } = usePosnummers(faseId)

  if (isLoadingFase) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="h-8 bg-muted rounded animate-pulse w-48" />
          <div className="h-64 bg-muted rounded animate-pulse" />
        </div>
      </Layout>
    )
  }

  if (!fase) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">Fase niet gevonden</p>
          <Button className="mt-4" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Terug
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
          <Link to={`/projecten/${fase.project_id}`} className="hover:text-foreground">
            {fase.project?.code || 'Project'}
          </Link>
          <ChevronRight className="h-4 w-4 mx-2" />
          <span className="text-foreground">Fase {fase.fase_nummer}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold font-mono">{fase.full_code}</h1>
            {fase.beschrijving && (
              <p className="text-lg text-muted-foreground mt-1">{fase.beschrijving}</p>
            )}
          </div>

          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Terug
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overzicht">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overzicht
            </TabsTrigger>
            <TabsTrigger value="bestanden">
              <FileText className="h-4 w-4 mr-2" />
              Bestanden
            </TabsTrigger>
            <TabsTrigger value="posnummers">
              <Package className="h-4 w-4 mr-2" />
              Posnummers
              {statistics && statistics.posnummer_count > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {statistics.posnummer_count}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="orders">
              <ListOrdered className="h-4 w-4 mr-2" />
              Orders
              {statistics && statistics.order_count > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {statistics.order_count}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="materiaal">
              <Layers className="h-4 w-4 mr-2" />
              Materiaal
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Overzicht */}
          <TabsContent value="overzicht" className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Posnummers</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isLoadingStats ? '...' : statistics?.posnummer_count || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Onderdelen in deze fase</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Orders</CardTitle>
                  <ListOrdered className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isLoadingStats ? '...' : statistics?.order_count || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Totaal aantal orders</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Bestanden</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">Gekoppelde bestanden</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Geclaimde Platen</CardTitle>
                  <Layers className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">Gekoppelde platen</p>
                </CardContent>
              </Card>
            </div>

            {/* Fase Info */}
            {(fase.opmerkingen_intern || fase.opmerkingen_werkplaats || fase.montage_datum) && (
              <Card>
                <CardHeader>
                  <CardTitle>Fase Informatie</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {fase.montage_datum && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Montage Datum</p>
                      <p className="text-base">
                        {new Date(fase.montage_datum).toLocaleDateString('nl-NL', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  )}

                  {fase.opmerkingen_werkplaats && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        Opmerkingen Werkplaats
                      </p>
                      <p className="text-base">{fase.opmerkingen_werkplaats}</p>
                    </div>
                  )}

                  {fase.opmerkingen_intern && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        Opmerkingen Intern
                      </p>
                      <p className="text-base italic text-muted-foreground">
                        {fase.opmerkingen_intern}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* TAB 2: Bestanden (Placeholder) */}
          <TabsContent value="bestanden">
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">Bestandsbeheer</p>
                  <p className="text-muted-foreground">
                    Bestandsupload en -beheer wordt binnenkort toegevoegd
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: Posnummers */}
          <TabsContent value="posnummers" className="space-y-4">
            {canManageProjects && (
              <div className="flex justify-end">
                <Button onClick={() => setCreatePosnummerOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nieuw Posnummer
                </Button>
              </div>
            )}

            {isLoadingPosnummers ? (
              <div className="flex items-center justify-center p-8">
                <p className="text-muted-foreground">Laden...</p>
              </div>
            ) : (
              <PosnummerTable faseId={faseId!} />
            )}
          </TabsContent>

          {/* TAB 4: Orders */}
          <TabsContent value="orders" className="space-y-4">
            {canManageProjects && (
              <div className="flex justify-end">
                <Button onClick={() => setCreateOrderreeksOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nieuwe Orderreeks
                </Button>
              </div>
            )}

            {isLoadingOrderreeksen ? (
              <div className="flex items-center justify-center p-8">
                <p className="text-muted-foreground">Laden...</p>
              </div>
            ) : !orderreeksen || orderreeksen.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <ListOrdered className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium mb-2">Nog geen orderreeksen</p>
                    <p className="text-muted-foreground mb-4">
                      Maak een orderreeks aan om orders te beheren
                    </p>
                    {permissions.canManageProjects && (
                      <Button onClick={() => setCreateOrderreeksOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Eerste Orderreeks Aanmaken
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {orderreeksen.map((orderreeks) => (
                  <OrderreeksCard key={orderreeks.id} orderreeks={orderreeks} faseId={faseId!} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB 5: Materiaal (Placeholder) */}
          <TabsContent value="materiaal">
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">Materiaal Koppeling</p>
                  <p className="text-muted-foreground">
                    Materiaal koppeling wordt binnenkort toegevoegd
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      {faseId && (
        <>
          <CreatePosnummerModal
            faseId={faseId}
            open={createPosnummerOpen}
            onOpenChange={setCreatePosnummerOpen}
          />
          <CreateOrderreeksModal
            faseId={faseId}
            open={createOrderreeksOpen}
            onOpenChange={setCreateOrderreeksOpen}
          />
        </>
      )}
    </Layout>
  )
}
