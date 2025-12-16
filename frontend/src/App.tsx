import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AuthProvider } from './hooks/useAuth'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import { Voorraad } from './pages/Voorraad'
import { Claims } from './pages/Claims'
import { Admin } from './pages/Admin'
import { Projects } from './pages/Projects'
import { ProjectDetail } from './pages/ProjectDetail'
import { FaseDetail } from './pages/FaseDetail'
import { Profile } from './pages/Profile'

// Create a QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
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
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />

            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  )
}

export default App
