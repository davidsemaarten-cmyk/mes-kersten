import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AuthProvider } from './hooks/useAuth'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Voorraad } from './pages/Voorraad'
import { Claims } from './pages/Claims'
import { Admin } from './pages/Admin'
import { Projects } from './pages/Projects'
import { ProjectDetail } from './pages/ProjectDetail'
import { FaseDetail } from './pages/FaseDetail'
import { Profile } from './pages/Profile'
import { StorageLocations } from './pages/StorageLocations'
import { Laserplanner } from './pages/Laserplanner'
import { LaserplannerDetail } from './pages/LaserplannerDetail'
import { NCViewerPage } from './pages/NCViewerPage'
import { StepViewerPage } from './pages/StepViewerPage'

// Create a QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 60_000, // 60 seconds
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/profiel" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

            {/* Project Routes */}
            <Route path="/projecten" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
            <Route path="/projecten/:projectId" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
            <Route path="/projecten/:projectId/fases/:faseId" element={<ProtectedRoute><FaseDetail /></ProtectedRoute>} />

            {/* PlateStock Routes */}
            <Route path="/voorraad" element={<ProtectedRoute><Voorraad /></ProtectedRoute>} />
            <Route path="/claims" element={<ProtectedRoute><Claims /></ProtectedRoute>} />

            {/* Laserplanner Routes */}
            <Route path="/laserplanner" element={<ProtectedRoute><Laserplanner /></ProtectedRoute>} />
            <Route path="/laserplanner/nc-viewer/:jobId/:ncId" element={<ProtectedRoute><NCViewerPage /></ProtectedRoute>} />
            <Route path="/laserplanner/step-viewer/:jobId/:stepId" element={<ProtectedRoute><StepViewerPage /></ProtectedRoute>} />
            <Route path="/laserplanner/:jobId" element={<ProtectedRoute><LaserplannerDetail /></ProtectedRoute>} />

            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="/storage-locations" element={<ProtectedRoute><StorageLocations /></ProtectedRoute>} />

            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  )
}

export { App }
