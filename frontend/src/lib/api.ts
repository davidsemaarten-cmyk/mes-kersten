import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies with requests (CRITICAL for httpOnly cookies)
})

// Helper function to get CSRF token from cookies
function getCsrfTokenFromCookie(): string | null {
  const name = 'csrf_token='
  const decodedCookie = decodeURIComponent(document.cookie)
  const cookieArray = decodedCookie.split(';')

  for (let i = 0; i < cookieArray.length; i++) {
    let cookie = cookieArray[i].trim()
    if (cookie.indexOf(name) === 0) {
      return cookie.substring(name.length, cookie.length)
    }
  }
  return null
}

// Development-only request/response logging
if (import.meta.env.DEV) {
  // Request logging
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

  // Response logging
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

// Add CSRF token to state-changing requests (POST, PUT, DELETE, PATCH)
api.interceptors.request.use((config) => {
  // Only add CSRF token for state-changing methods
  if (config.method && ['post', 'put', 'delete', 'patch'].includes(config.method.toLowerCase())) {
    const csrfToken = getCsrfTokenFromCookie()
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken
    }
  }
  return config
})

// Handle auth errors (NO token interceptor needed - cookies sent automatically)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - redirect to login
      // Only redirect if we're not already on the login page (prevent infinite loop)
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
