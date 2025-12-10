import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AuthProvider } from './hooks/useAuth'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import { Voorraad } from './pages/Voorraad'
import { Claims } from './pages/Claims'
import { Werkplaats } from './pages/Werkplaats'
import { Admin } from './pages/Admin'

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
            <Route path="/dashboard" element={<Dashboard />} />

            {/* PlateStock Routes */}
            <Route path="/voorraad" element={<Voorraad />} />
            <Route path="/claims" element={<Claims />} />
            <Route path="/werkplaats" element={<Werkplaats />} />
            <Route path="/admin" element={<Admin />} />

            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  )
}

export default App
