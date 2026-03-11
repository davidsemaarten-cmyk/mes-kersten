import { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import type { User } from '../types/database'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

/**
 * Auth Context Provider
 * Manages authentication state and provides auth functions
 * Uses httpOnly cookies for secure token storage (XSS protection)
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // Handle auth:logout events dispatched by the API interceptor on 401 responses.
  // Using client-side navigation (navigate) avoids a full page reload and preserves
  // the React Query cache so data re-fetches cleanly after the user logs back in.
  useEffect(() => {
    const handleAuthLogout = () => {
      setUser(null)
      navigate('/login', { replace: true })
    }
    window.addEventListener('auth:logout', handleAuthLogout)
    return () => window.removeEventListener('auth:logout', handleAuthLogout)
  }, [navigate])

  // Check for existing session on mount by calling /api/auth/me
  // useRef prevents duplicate fetches caused by React StrictMode's double-mount cycle
  const authInitialized = useRef(false)
  useEffect(() => {
    if (authInitialized.current) return
    authInitialized.current = true

    const initAuth = async () => {
      try {
        // Try to get current user from server (cookie will be sent automatically)
        const response = await api.get('/api/auth/me')

        if (response.data) {
          setUser(response.data)
        }
      } catch (error) {
        // No valid session - user needs to login
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await api.post('/api/auth/login', { email, password })

      // Token is stored in httpOnly cookie by server
      // Response contains user info + CSRF token (NO JWT token in body)
      if (response.data.user) {
        setUser(response.data.user)
        // CSRF token is automatically stored in cookie by server
        // No need to manually handle it - axios interceptor will read it
      }
    } catch (error) {
      throw error
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      // Call logout endpoint to clear httpOnly cookie
      await api.post('/api/auth/logout')
    } catch (error) {
      // Even if logout fails, clear local state
      console.error('Logout error:', error)
    } finally {
      setUser(null)
    }
  }, [])

  // Memoize context value to prevent unnecessary re-renders of consumers
  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * useAuth hook
 * Access authentication context
 */
export function useAuth() {
  const context = useContext(AuthContext)
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  return context
}
