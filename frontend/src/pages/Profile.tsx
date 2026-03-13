/**
 * Profile Page
 * Phase 0: Foundation & Refactoring
 *
 * User profile page with signature upload
 */

import { Layout } from '../components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { useAuth } from '../hooks/useAuth'
import { getRoleName } from '../types/roles'
import { User } from 'lucide-react'

export function Profile() {
  const { user } = useAuth()

  if (!user) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">Niet ingelogd</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Profiel</h1>
          <p className="text-sm text-gray-600 mt-1">Beheer uw persoonlijke gegevens</p>
        </div>

        {/* User Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Gebruikersinformatie
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Naam</p>
                <p className="text-base">{user.full_name || 'Niet ingesteld'}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Email</p>
                <p className="text-base">{user.email}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Rol</p>
                {user.role && <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">{getRoleName(user.role)}</Badge>}
              </div>

            </div>
          </CardContent>
        </Card>

        {/* Digital Signature Section - Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Digitale Handtekening</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground">
                Handtekening upload functionaliteit komt binnenkort
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Binnenkort beschikbaar
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
