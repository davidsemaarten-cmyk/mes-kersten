import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
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

  // Check for existing session on mount by calling /api/auth/me
  useEffect(() => {
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

  const login = async (email: string, password: string) => {
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
  }

  const logout = async () => {
    try {
      // Call logout endpoint to clear httpOnly cookie
      await api.post('/api/auth/logout')
    } catch (error) {
      // Even if logout fails, clear local state
      console.error('Logout error:', error)
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
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
