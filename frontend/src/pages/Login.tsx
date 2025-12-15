import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login mislukt. Probeer opnieuw.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            MES Kersten
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Log in met je account
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email adres
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email adres"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Wachtwoord
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Wachtwoord"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Bezig met inloggen...' : 'Inloggen'}
            </button>
          </div>

          <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-md border border-gray-200">
            <p className="font-semibold text-gray-700 mb-2">🧪 Test Credentials (Development)</p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between items-center hover:bg-gray-100 px-2 py-1 rounded cursor-pointer" onClick={() => { setEmail('admin@kersten.nl'); setPassword('admin123'); }}>
                <span className="font-semibold text-blue-600">Admin</span>
                <span className="font-mono text-gray-600">admin@kersten.nl / admin123</span>
              </div>
              <div className="flex justify-between items-center hover:bg-gray-100 px-2 py-1 rounded cursor-pointer" onClick={() => { setEmail('werkvoorbereider@kersten.nl'); setPassword('test123'); }}>
                <span className="font-semibold text-purple-600">Werkvoorbereider</span>
                <span className="font-mono text-gray-600">werkvoorbereider@kersten.nl / test123</span>
              </div>
              <div className="flex justify-between items-center hover:bg-gray-100 px-2 py-1 rounded cursor-pointer" onClick={() => { setEmail('werkplaats@kersten.nl'); setPassword('test123'); }}>
                <span className="font-semibold text-green-600">Werkplaats</span>
                <span className="font-mono text-gray-600">werkplaats@kersten.nl / test123</span>
              </div>
              <div className="flex justify-between items-center hover:bg-gray-100 px-2 py-1 rounded cursor-pointer" onClick={() => { setEmail('logistiek@kersten.nl'); setPassword('test123'); }}>
                <span className="font-semibold text-orange-600">Logistiek</span>
                <span className="font-mono text-gray-600">logistiek@kersten.nl / test123</span>
              </div>
              <div className="flex justify-between items-center hover:bg-gray-100 px-2 py-1 rounded cursor-pointer" onClick={() => { setEmail('tekenaar@kersten.nl'); setPassword('test123'); }}>
                <span className="font-semibold text-indigo-600">Tekenaar</span>
                <span className="font-mono text-gray-600">tekenaar@kersten.nl / test123</span>
              </div>
              <div className="flex justify-between items-center hover:bg-gray-100 px-2 py-1 rounded cursor-pointer" onClick={() => { setEmail('laser@kersten.nl'); setPassword('test123'); }}>
                <span className="font-semibold text-red-600">Laser</span>
                <span className="font-mono text-gray-600">laser@kersten.nl / test123</span>
              </div>
              <div className="flex justify-between items-center hover:bg-gray-100 px-2 py-1 rounded cursor-pointer" onClick={() => { setEmail('buislaser@kersten.nl'); setPassword('test123'); }}>
                <span className="font-semibold text-pink-600">Buislaser</span>
                <span className="font-mono text-gray-600">buislaser@kersten.nl / test123</span>
              </div>
              <div className="flex justify-between items-center hover:bg-gray-100 px-2 py-1 rounded cursor-pointer" onClick={() => { setEmail('kantbank@kersten.nl'); setPassword('test123'); }}>
                <span className="font-semibold text-teal-600">Kantbank</span>
                <span className="font-mono text-gray-600">kantbank@kersten.nl / test123</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3 italic">💡 Tip: Klik op een rol om de credentials in te vullen</p>
          </div>
        </form>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Backend status:{' '}
            <a
              href="http://localhost:8000/health"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-500"
            >
              Check health
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
