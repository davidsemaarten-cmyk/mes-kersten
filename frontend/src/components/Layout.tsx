import { ReactNode } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Package, FileText, Wrench, Settings, LayoutDashboard, Folder } from 'lucide-react'

interface LayoutProps {
  children: ReactNode
}

/**
 * Shared layout component with navigation and user info
 * Following PROJECT-MASTER.md pattern
 */
export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navigationItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Projecten', path: '/projecten', icon: Folder },
    { name: 'Voorraad', path: '/voorraad', icon: Package },
    { name: 'Claims', path: '/claims', icon: FileText },
    { name: 'Werkplaats', path: '/werkplaats', icon: Wrench },
    { name: 'Admin', path: '/admin', icon: Settings },
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold text-gray-900">MES Kersten</h1>

              {user && (
                <div className="hidden md:flex space-x-1">
                  {navigationItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                          isActive(item.path)
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {item.name}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>

            {user && (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  {user.full_name || user.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Uitloggen
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}

// Named export for consistency
export { Layout }
