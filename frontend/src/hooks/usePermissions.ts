/**
 * usePermissions Hook
 * Phase 0: Foundation & Refactoring
 *
 * Provides easy access to current user's role-based permissions
 */

import { useAuth } from './useAuth'
import { getRolePermissions, DEFAULT_PERMISSIONS, type RolePermissions, type UserRole } from '../types/roles'
import type { User } from '../types/database'

/**
 * Type guard to check if user has a valid role property
 */
function hasValidRole(user: unknown): user is { role: UserRole } {
  return (
    typeof user === 'object' &&
    user !== null &&
    'role' in user &&
    typeof (user as { role: unknown }).role === 'string'
  )
}

/**
 * Hook to access current user's permissions
 *
 * @returns {Object} Object containing:
 *   - permissions: RolePermissions object with all permission flags
 *   - role: Current user's role (or null if not authenticated)
 *   - hasPermission: Helper function to check a specific permission
 *
 * @example
 * ```tsx
 * function ProjectPage() {
 *   const { permissions, hasPermission } = usePermissions()
 *
 *   if (!permissions.canViewProjects) {
 *     return <div>Access denied</div>
 *   }
 *
 *   return (
 *     <div>
 *       {hasPermission('canCreateProjects') && (
 *         <button>Create Project</button>
 *       )}
 *     </div>
 *   )
 * }
 * ```
 */
export function usePermissions() {
  const { user } = useAuth()

  // Type-safe role extraction
  // Get user's primary role (assuming single role for now, can be extended for multiple roles)
  // TODO: When implementing multiple roles per user, this logic will need to combine permissions
  const role: UserRole | null = hasValidRole(user) ? user.role : null

  // Get permissions for the user's role
  // Uses shared DEFAULT_PERMISSIONS for unauthenticated users (DRY principle)
  const permissions: RolePermissions = role
    ? getRolePermissions(role)
    : DEFAULT_PERMISSIONS

  /**
   * Helper function to check a specific permission by key
   */
  const hasPermission = (permissionKey: keyof RolePermissions): boolean => {
    return permissions[permissionKey]
  }

  // Computed permission helpers
  const isAdmin = role === 'admin'
  const isWerkvoorbereider = role === 'werkvoorbereider'
  const canManageProjects = permissions.canCreateProjects || permissions.canEditProjects

  return {
    permissions,
    role,
    hasPermission,
    isAdmin,
    isWerkvoorbereider,
    canManageProjects, // Helper for showing project management UI
  }
}
