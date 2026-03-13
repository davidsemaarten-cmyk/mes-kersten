import { useEffect, useState } from 'react'
import { Layout } from '../components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import api from '../lib/api'

export function Dashboard() {
  const [apiStatus, setApiStatus] = useState<{ status: string; message: string; version: string } | null>(null)

  useEffect(() => {
    // Fetch API status
    api.get('/')
      .then((res) => setApiStatus(res.data))
      .catch((err) => console.error('Failed to fetch API status', err))
  }, [])

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manufacturing Execution System voor M.C. Kersten
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* API Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>API-status</CardTitle>
            </CardHeader>
            <CardContent>
              {apiStatus ? (
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="font-medium">Status:</span>{' '}
                    <span className="text-green-600">{apiStatus.status}</span>
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Bericht:</span>{' '}
                    {apiStatus.message}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Versie:</span>{' '}
                    {apiStatus.version}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Laden...</p>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle>Snelkoppelingen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <a
                  href="/voorraad"
                  className="block p-3 rounded-md bg-primary/10 hover:bg-primary/20 transition-colors"
                >
                  <p className="font-medium">Voorraad</p>
                  <p className="text-sm text-muted-foreground">Bekijk platenvoorraad</p>
                </a>
                <a
                  href="/claims"
                  className="block p-3 rounded-md bg-primary/10 hover:bg-primary/20 transition-colors"
                >
                  <p className="font-medium">Claims</p>
                  <p className="text-sm text-muted-foreground">Bekijk actieve claims</p>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coming Soon Section */}
        <Card>
          <CardHeader>
            <CardTitle>Binnenkort beschikbaar</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Checklists - Kwaliteitscontrole en afvinklijsten</li>
              <li>Bestandsbeheer - Upload en beheer van bestanden</li>
              <li>Orderuitvoering - Voortgang en uitvoering van orders</li>
              <li>Fotodocumentatie - Foto's bij projecten en orders</li>
              <li>Certificaatexport - Exporteer materiaalcertificaten</li>
              <li>Notificaties - Meldingen en waarschuwingen</li>
            </ul>
          </CardContent>
        </Card>

        {/* API Documentation Link */}
        <Card>
          <CardContent className="pt-6">
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline text-sm"
            >
              Bekijk API-documentatie →
            </a>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
