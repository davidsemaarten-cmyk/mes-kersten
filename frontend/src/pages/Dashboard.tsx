import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import api from '../lib/api'

export default function Dashboard() {
  const [apiStatus, setApiStatus] = useState<any>(null)

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
              <CardTitle>API Status</CardTitle>
            </CardHeader>
            <CardContent>
              {apiStatus ? (
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="font-medium">Status:</span>{' '}
                    <span className="text-green-600">{apiStatus.status}</span>
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Message:</span>{' '}
                    {apiStatus.message}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Version:</span>{' '}
                    {apiStatus.version}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Loading...</p>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
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
            <CardTitle>Coming Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Project Management - Create projects/phases</li>
              <li>File Handling - Upload and manage files</li>
              <li>Order Management - Track purchases and deliveries</li>
              <li>Cutting Lists - Generate optimized zaaglijsten</li>
              <li>Planning - Gantt charts and calendar views</li>
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
              View API Documentation →
            </a>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
