import { ReactNode, useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  Package,
  FileText,
  Settings,
  LayoutDashboard,
  Folder,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User
} from 'lucide-react'

interface LayoutProps {
  children: ReactNode
}

/**
 * Linear-inspired sidebar layout component
 * Features collapsible sidebar with localStorage persistence
 */
export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Initialize sidebar state from localStorage, default to expanded
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed')
    return saved ? JSON.parse(saved) : false
  })

  // Save sidebar state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed))
  }, [isCollapsed])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed)
  }

  const navigationItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Projecten', path: '/projecten', icon: Folder },
    { name: 'Voorraad', path: '/voorraad', icon: Package },
    { name: 'Claims', path: '/claims', icon: FileText },
    { name: 'Admin', path: '/admin', icon: Settings },
  ]

  const isActive = (path: string) => {
    // Match exact path or any child path (for project details, etc.)
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      {user && (
        <aside
          className={`fixed left-0 top-0 h-screen bg-white border-r border-gray-200 transition-all duration-200 ease-in-out ${
            isCollapsed ? 'w-16' : 'w-60'
          }`}
        >
          {/* Sidebar Header */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
            {!isCollapsed && (
              <h1 className="text-base font-semibold text-gray-900">MES Kersten</h1>
            )}
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-md hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-900"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-2 space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.path)

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  title={isCollapsed ? item.name : undefined}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && <span>{item.name}</span>}
                </Link>
              )
            })}
          </nav>

          {/* User Section at Bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-2 border-t border-gray-200">
            <Link
              to="/profiel"
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors ${
                isActive('/profiel') ? 'bg-gray-100 text-gray-900' : ''
              }`}
              title={isCollapsed ? user.full_name || user.email : undefined}
            >
              <User className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && (
                <span className="truncate">{user.full_name || user.email}</span>
              )}
            </Link>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors mt-1"
              title={isCollapsed ? 'Uitloggen' : undefined}
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span>Uitloggen</span>}
            </button>
          </div>
        </aside>
      )}

      {/* Main Content Area */}
      <div
        className={`flex-1 transition-all duration-200 ease-in-out ${
          user ? (isCollapsed ? 'ml-16' : 'ml-60') : ''
        }`}
      >
        {/* Top Header */}
        {user && (
          <header className="h-16 border-b border-gray-200 bg-white px-8 flex items-center">
            <div className="flex-1">
              {/* Page title will be rendered by individual pages */}
            </div>

            {/* User info moved to sidebar, this space can be used for page actions */}
          </header>
        )}

        {/* Page Content */}
        <main className={`${user ? 'p-8' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  )
}

// Named export for consistency
export { Layout }
