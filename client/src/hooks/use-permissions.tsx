import { useAuth } from '@/contexts/auth-context';
import { PERMISSIONS, Permission } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';

export function usePermissions() {
  const { user } = useAuth();

  // Fetch user's actual permissions from the API
  const { data: userPermissions = [] } = useQuery({
    queryKey: [`/api/users/${user?.id}/permissions`],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;
    
    // Super admins have all permissions
    if (user.isSuperAdmin) return true;

    // Check actual permissions from database
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