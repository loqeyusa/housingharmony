import { useAuth } from '@/contexts/auth-context';
import { PERMISSIONS, Permission } from '@shared/schema';

export function usePermissions() {
  const { user } = useAuth();

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;
    
    // Super admins have all permissions
    if (user.isSuperAdmin) return true;

    // Define role-based permissions
    const rolePermissions: Record<string, Permission[]> = {
      'Administrator': [
        PERMISSIONS.MANAGE_USERS,
        PERMISSIONS.MANAGE_ROLES,
        PERMISSIONS.VIEW_AUDIT_LOGS,
        PERMISSIONS.VIEW_CLIENTS,
        PERMISSIONS.CREATE_CLIENTS,
        PERMISSIONS.EDIT_CLIENTS,
        PERMISSIONS.DELETE_CLIENTS,
        PERMISSIONS.VIEW_PROPERTIES,
        PERMISSIONS.CREATE_PROPERTIES,
        PERMISSIONS.EDIT_PROPERTIES,
        PERMISSIONS.DELETE_PROPERTIES,
        PERMISSIONS.VIEW_APPLICATIONS,
        PERMISSIONS.CREATE_APPLICATIONS,
        PERMISSIONS.EDIT_APPLICATIONS,
        PERMISSIONS.DELETE_APPLICATIONS,
        PERMISSIONS.APPROVE_APPLICATIONS,
        PERMISSIONS.VIEW_TRANSACTIONS,
        PERMISSIONS.CREATE_TRANSACTIONS,
        PERMISSIONS.EDIT_TRANSACTIONS,
        PERMISSIONS.DELETE_TRANSACTIONS,
        PERMISSIONS.MANAGE_POOL_FUND,
        PERMISSIONS.VIEW_VENDORS,
        PERMISSIONS.CREATE_VENDORS,
        PERMISSIONS.EDIT_VENDORS,
        PERMISSIONS.DELETE_VENDORS,
        PERMISSIONS.VIEW_OTHER_SUBSIDIES,
        PERMISSIONS.CREATE_OTHER_SUBSIDIES,
        PERMISSIONS.EDIT_OTHER_SUBSIDIES,
        PERMISSIONS.DELETE_OTHER_SUBSIDIES,
        PERMISSIONS.VIEW_HOUSING_SUPPORT,
        PERMISSIONS.CREATE_HOUSING_SUPPORT,
        PERMISSIONS.EDIT_HOUSING_SUPPORT,
        PERMISSIONS.DELETE_HOUSING_SUPPORT,
        PERMISSIONS.VIEW_REPORTS,
        PERMISSIONS.EXPORT_DATA,
      ],
      'Manager': [
        PERMISSIONS.VIEW_CLIENTS,
        PERMISSIONS.CREATE_CLIENTS,
        PERMISSIONS.EDIT_CLIENTS,
        PERMISSIONS.VIEW_PROPERTIES,
        PERMISSIONS.CREATE_PROPERTIES,
        PERMISSIONS.EDIT_PROPERTIES,
        PERMISSIONS.VIEW_APPLICATIONS,
        PERMISSIONS.CREATE_APPLICATIONS,
        PERMISSIONS.EDIT_APPLICATIONS,
        PERMISSIONS.APPROVE_APPLICATIONS,
        PERMISSIONS.VIEW_TRANSACTIONS,
        PERMISSIONS.CREATE_TRANSACTIONS,
        PERMISSIONS.EDIT_TRANSACTIONS,
        PERMISSIONS.MANAGE_POOL_FUND,
        PERMISSIONS.VIEW_VENDORS,
        PERMISSIONS.CREATE_VENDORS,
        PERMISSIONS.EDIT_VENDORS,
        PERMISSIONS.VIEW_OTHER_SUBSIDIES,
        PERMISSIONS.CREATE_OTHER_SUBSIDIES,
        PERMISSIONS.EDIT_OTHER_SUBSIDIES,
        PERMISSIONS.VIEW_HOUSING_SUPPORT,
        PERMISSIONS.CREATE_HOUSING_SUPPORT,
        PERMISSIONS.EDIT_HOUSING_SUPPORT,
        PERMISSIONS.VIEW_REPORTS,
        PERMISSIONS.EXPORT_DATA,
      ],
      'Staff': [
        PERMISSIONS.VIEW_CLIENTS,
        PERMISSIONS.CREATE_CLIENTS,
        PERMISSIONS.EDIT_CLIENTS,
        PERMISSIONS.VIEW_PROPERTIES,
        PERMISSIONS.VIEW_APPLICATIONS,
        PERMISSIONS.CREATE_APPLICATIONS,
        PERMISSIONS.EDIT_APPLICATIONS,
        PERMISSIONS.VIEW_TRANSACTIONS,
        PERMISSIONS.CREATE_TRANSACTIONS,
        PERMISSIONS.VIEW_VENDORS,
        PERMISSIONS.VIEW_OTHER_SUBSIDIES,
        PERMISSIONS.VIEW_HOUSING_SUPPORT,
        PERMISSIONS.CREATE_HOUSING_SUPPORT,
        PERMISSIONS.VIEW_REPORTS,
      ],
    };

    // For now, we'll determine role based on user properties
    // In a full implementation, you'd fetch the user's actual roles from the API
    let userRole = 'Staff'; // Default role
    if (user.isSuperAdmin) {
      userRole = 'Administrator';
    }

    const userPermissions = rolePermissions[userRole] || [];
    return userPermissions.includes(permission);
  };

  const canAccess = (permissions: Permission[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };

  const getAccessiblePages = () => {
    const pages = [
      { path: '/', permission: null }, // Dashboard accessible to all
      { path: '/clients', permission: PERMISSIONS.VIEW_CLIENTS },
      { path: '/properties', permission: PERMISSIONS.VIEW_PROPERTIES },
      { path: '/applications', permission: PERMISSIONS.VIEW_APPLICATIONS },
      { path: '/housing-support', permission: PERMISSIONS.VIEW_HOUSING_SUPPORT },
      { path: '/vendors', permission: PERMISSIONS.VIEW_VENDORS },
      { path: '/other-subsidies', permission: PERMISSIONS.VIEW_OTHER_SUBSIDIES },
      { path: '/financials', permission: PERMISSIONS.VIEW_TRANSACTIONS },
      { path: '/pool-fund', permission: PERMISSIONS.MANAGE_POOL_FUND },
      { path: '/user-management', permission: PERMISSIONS.MANAGE_USERS },
      { path: '/reports', permission: PERMISSIONS.VIEW_REPORTS },
    ];

    return pages.filter(page => 
      page.permission === null || hasPermission(page.permission)
    );
  };

  return {
    hasPermission,
    canAccess,
    getAccessiblePages,
    isStaff: !user?.isSuperAdmin,
    isAdmin: user?.isSuperAdmin,
  };
}