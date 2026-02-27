/**
 * User Role Types and Permissions
 * Phase 0: Foundation & Refactoring
 *
 * Defines all user roles and their permissions based on PROJECT-FUNCTIONAL-OVERVIEW.md
 */

// =====================================================
// Role Type Definition
// =====================================================

/**
 * All user roles in the MES Kersten system
 */
export type UserRole =
  | 'admin'              // System administration and configuration
  | 'werkvoorbereider'   // Work preparation specialist
  | 'werkplaats'         // Workshop worker
  | 'logistiek'          // Logistics specialist
  | 'tekenaar'           // Draftsman (view-only)
  | 'laser'              // Laser operator
  | 'buislaser'          // Tube laser operator
  | 'kantbank'           // Press brake operator

// =====================================================
// Permission Interface
// =====================================================

/**
 * Permission flags for role-based access control
 */
export interface RolePermissions {
  // Project & Fase Management
  canCreateProjects: boolean
  canEditProjects: boolean
  canViewProjects: boolean
  canDeleteProjects: boolean

  // Order Management
  canCreateOrders: boolean
  canExecuteOrders: boolean
  canApproveOrders: boolean
  canModifyOrderSequence: boolean
  canReopenOrders: boolean

  // File Management
  canUploadFiles: boolean
  canDownloadFiles: boolean
  canViewDrawings: boolean

  // PlateStock Management
  canManagePlates: boolean
  canClaimPlates: boolean
  canConsumePlates: boolean

  // Admin Functions
  canAccessAdmin: boolean
  canManageUsers: boolean
  canConfigureOrderTypes: boolean
  canManageChecklists: boolean

  // Checklist & Execution
  canExtendChecklists: boolean
  canCompleteChecklists: boolean
  canMarkOrderComplete: boolean

  // Certificate Management
  canUploadCertificates: boolean
  canExportCertificates: boolean

  // Laserplanner Permissions
  canPlanLaser: boolean
  canViewLaserQueue: boolean

  // Special Permissions
  canViewOnly: boolean  // True for tekenaar role
  canSwitchRoles: boolean  // True for admin role
}

// =====================================================
// Default Permissions (all false)
// =====================================================

/**
 * Default permissions object with all permissions set to false.
 * Used as a base and for unauthenticated users.
 * Frozen to prevent accidental modification.
 */
export const DEFAULT_PERMISSIONS: Readonly<RolePermissions> = Object.freeze({
  canCreateProjects: false,
  canEditProjects: false,
  canViewProjects: false,
  canDeleteProjects: false,
  canCreateOrders: false,
  canExecuteOrders: false,
  canApproveOrders: false,
  canModifyOrderSequence: false,
  canReopenOrders: false,
  canUploadFiles: false,
  canDownloadFiles: false,
  canViewDrawings: false,
  canManagePlates: false,
  canClaimPlates: false,
  canConsumePlates: false,
  canAccessAdmin: false,
  canManageUsers: false,
  canConfigureOrderTypes: false,
  canManageChecklists: false,
  canExtendChecklists: false,
  canCompleteChecklists: false,
  canMarkOrderComplete: false,
  canUploadCertificates: false,
  canExportCertificates: false,
  canPlanLaser: false,
  canViewLaserQueue: false,
  canViewOnly: false,
  canSwitchRoles: false,
})

// =====================================================
// Permission Mapping by Role
// =====================================================

/**
 * Get permissions for a specific role
 * Based on PROJECT-FUNCTIONAL-OVERVIEW.md Section 2: User Roles & Permissions
 */
export function getRolePermissions(role: UserRole): RolePermissions {
  // Clone the default permissions as a base
  const basePermissions: RolePermissions = { ...DEFAULT_PERMISSIONS }

  switch (role) {
    case 'admin':
      // Admin has all permissions
      return {
        canCreateProjects: true,
        canEditProjects: true,
        canViewProjects: true,
        canDeleteProjects: true,
        canCreateOrders: true,
        canExecuteOrders: true,
        canApproveOrders: true,
        canModifyOrderSequence: true,
        canReopenOrders: true,
        canUploadFiles: true,
        canDownloadFiles: true,
        canViewDrawings: true,
        canManagePlates: true,
        canClaimPlates: true,
        canConsumePlates: true,
        canAccessAdmin: true,
        canManageUsers: true,
        canConfigureOrderTypes: true,
        canManageChecklists: true,
        canExtendChecklists: true,
        canCompleteChecklists: true,
        canMarkOrderComplete: true,
        canUploadCertificates: true,
        canExportCertificates: true,
        canPlanLaser: true,
        canViewLaserQueue: true,
        canViewOnly: false,
        canSwitchRoles: true,
      }

    case 'werkvoorbereider':
      // Work preparation specialist - main power user
      return {
        canCreateProjects: true,
        canEditProjects: true,
        canViewProjects: true,
        canDeleteProjects: false,  // Only admin can delete
        canCreateOrders: true,
        canExecuteOrders: false,  // Cannot execute, only plan
        canApproveOrders: true,
        canModifyOrderSequence: true,
        canReopenOrders: true,
        canUploadFiles: true,
        canDownloadFiles: true,
        canViewDrawings: true,
        canManagePlates: true,
        canClaimPlates: true,
        canConsumePlates: true,
        canAccessAdmin: false,
        canManageUsers: false,
        canConfigureOrderTypes: false,
        canManageChecklists: false,  // Cannot modify base templates
        canExtendChecklists: true,  // Can add custom items per order
        canCompleteChecklists: true,
        canMarkOrderComplete: false,  // Only werkplaats can mark complete
        canUploadCertificates: true,
        canExportCertificates: true,
        canPlanLaser: true,
        canViewLaserQueue: true,
        canViewOnly: false,
        canSwitchRoles: false,
      }

    case 'werkplaats':
      // Workshop worker - executes orders
      return {
        canCreateProjects: false,
        canEditProjects: false,
        canViewProjects: true,
        canDeleteProjects: false,
        canCreateOrders: false,
        canExecuteOrders: true,
        canApproveOrders: false,  // Cannot approve, only werkvoorbereider
        canModifyOrderSequence: false,
        canReopenOrders: false,
        canUploadFiles: false,  // Except plate photos (handled separately)
        canDownloadFiles: true,
        canViewDrawings: true,
        canManagePlates: true,  // Can add, edit, delete plates
        canClaimPlates: true,
        canConsumePlates: false,  // Only werkvoorbereider can consume
        canAccessAdmin: false,
        canManageUsers: false,
        canConfigureOrderTypes: false,
        canManageChecklists: false,
        canExtendChecklists: false,
        canCompleteChecklists: true,
        canMarkOrderComplete: true,
        canUploadCertificates: false,
        canExportCertificates: false,
        canPlanLaser: false,
        canViewLaserQueue: false,
        canViewOnly: false,
        canSwitchRoles: false,
      }

    case 'logistiek':
      // Logistics - has all werkplaats permissions plus material intake
      return {
        canCreateProjects: false,
        canEditProjects: false,
        canViewProjects: true,
        canDeleteProjects: false,
        canCreateOrders: false,
        canExecuteOrders: true,
        canApproveOrders: false,
        canModifyOrderSequence: false,
        canReopenOrders: false,
        canUploadFiles: false,
        canDownloadFiles: true,
        canViewDrawings: true,
        canManagePlates: true,
        canClaimPlates: true,
        canConsumePlates: false,
        canAccessAdmin: false,
        canManageUsers: false,
        canConfigureOrderTypes: false,
        canManageChecklists: false,
        canExtendChecklists: false,
        canCompleteChecklists: true,
        canMarkOrderComplete: true,
        canUploadCertificates: true,  // Primary responsibility: upload certificates on material intake
        canExportCertificates: false,
        canPlanLaser: false,
        canViewLaserQueue: false,
        canViewOnly: false,
        canSwitchRoles: false,
      }

    case 'tekenaar':
      // Draftsman - view-only access
      return {
        canCreateProjects: false,
        canEditProjects: false,
        canViewProjects: true,
        canDeleteProjects: false,
        canCreateOrders: false,
        canExecuteOrders: false,
        canApproveOrders: false,
        canModifyOrderSequence: false,
        canReopenOrders: false,
        canUploadFiles: false,
        canDownloadFiles: true,
        canViewDrawings: true,
        canManagePlates: false,  // Cannot access voorraad
        canClaimPlates: false,
        canConsumePlates: false,
        canAccessAdmin: false,
        canManageUsers: false,
        canConfigureOrderTypes: false,
        canManageChecklists: false,
        canExtendChecklists: false,
        canCompleteChecklists: false,
        canMarkOrderComplete: false,
        canUploadCertificates: false,
        canExportCertificates: false,
        canPlanLaser: false,
        canViewLaserQueue: false,
        canViewOnly: true,
        canSwitchRoles: false,
      }

    case 'laser':
    case 'buislaser':
    case 'kantbank':
      // Machine operators - execute specific machine operations
      return {
        canCreateProjects: false,
        canEditProjects: false,
        canViewProjects: true,  // View orders assigned to their machine
        canDeleteProjects: false,
        canCreateOrders: false,
        canExecuteOrders: true,  // Execute assigned orders
        canApproveOrders: false,
        canModifyOrderSequence: false,
        canReopenOrders: false,
        canUploadFiles: false,
        canDownloadFiles: true,
        canViewDrawings: true,  // View cutting lists and drawings
        canManagePlates: false,
        canClaimPlates: false,
        canConsumePlates: false,
        canAccessAdmin: false,
        canManageUsers: false,
        canConfigureOrderTypes: false,
        canManageChecklists: false,
        canExtendChecklists: false,
        canCompleteChecklists: true,  // Fill in machine-specific checklists
        canMarkOrderComplete: true,  // Mark assigned orders complete
        canUploadCertificates: false,
        canExportCertificates: false,
        canPlanLaser: false,
        canViewLaserQueue: true,  // Can view laser queue
        canViewOnly: false,
        canSwitchRoles: false,
      }

    default:
      // Return base permissions (all false) for unknown roles
      return basePermissions
  }
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Check if role can access admin pages
 */
export function canAccessAdminPages(role: UserRole): boolean {
  return getRolePermissions(role).canAccessAdmin
}

/**
 * Check if role can access plate stock
 */
export function canAccessPlateStock(role: UserRole): boolean {
  const permissions = getRolePermissions(role)
  return permissions.canManagePlates || permissions.canClaimPlates
}

/**
 * Check if role has any workshop permissions
 */
export function hasWorkshopPermissions(role: UserRole): boolean {
  const permissions = getRolePermissions(role)
  return permissions.canExecuteOrders || permissions.canCompleteChecklists
}

/**
 * Get human-readable role name
 */
export function getRoleName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    admin: 'Administrator',
    werkvoorbereider: 'Werkvoorbereider',
    werkplaats: 'Werkplaats',
    logistiek: 'Logistiek',
    tekenaar: 'Tekenaar',
    laser: 'Laser Operator',
    buislaser: 'Buislaser Operator',
    kantbank: 'Kantbank Operator',
  }
  return roleNames[role] || role
}
