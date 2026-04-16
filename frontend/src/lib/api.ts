import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Keep for backwards compat with cookie auth
})

// ── Token helpers ──────────────────────────────────────────────────────
const TOKEN_KEY = 'mes_access_token'

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function storeToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

// ── Request interceptor: attach Bearer token ───────────────────────────
api.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Development-only logging ───────────────────────────────────────────
if (import.meta.env.DEV) {
  api.interceptors.request.use(
    (config) => {
      console.log(
        `%c[API Request]%c ${config.method?.toUpperCase()} ${config.url}`,
        'color: #3b82f6; font-weight: bold',
        'color: #6b7280',
        config.data ? { data: config.data } : ''
      )
      return config
    },
    (error) => {
      console.error('[API Request Error]', error)
      return Promise.reject(error)
    }
  )

  api.interceptors.response.use(
    (response) => {
      console.log(
        `%c[API Response]%c ${response.status} ${response.config.url}`,
        'color: #10b981; font-weight: bold',
        'color: #6b7280',
        response.data ? { data: response.data } : ''
      )
      return response
    },
    (error) => {
      console.error(
        `%c[API Error]%c ${error.config?.url} - ${error.response?.status || 'Network Error'}`,
        'color: #ef4444; font-weight: bold',
        'color: #6b7280',
        error.response?.data || error.message
      )
      return Promise.reject(error)
    }
  )
}

// ── Response interceptor: handle 401 ───────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear stored token and notify auth layer
      clearToken()
      if (!window.location.pathname.includes('/login')) {
        window.dispatchEvent(new CustomEvent('auth:logout'))
      }
    }
    return Promise.reject(error)
  }
)

export default api
