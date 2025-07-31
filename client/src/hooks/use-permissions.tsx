import { useAuth } from '@/contexts/auth-context';
import { PERMISSIONS, Permission } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

export function usePermissions() {
  const { user } = useAuth();

  // Fetch user's actual permissions from the API with optimized caching
  const { data: userPermissions = [], isLoading } = useQuery({
    queryKey: [`/api/users/${user?.id}/permissions`],
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
  });

  // Memoize permission checks to avoid repeated computations
  const permissionSet = useMemo(() => 
    new Set(userPermissions as Permission[]), 
    [userPermissions]
  );

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;
    
    // Super admins have all permissions
    if (user.isSuperAdmin) return true;

    // Use Set for O(1) lookup performance
    return permissionSet.has(permission);
  };

  const canAccess = (permissions: Permission[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };

  // Memoize accessible pages calculation
  const accessiblePages = useMemo(() => {
    const pages = [
      { path: '/', permission: null }, // Dashboard accessible to all
      { path: '/clients', permission: PERMISSIONS.VIEW_CLIENTS },
      { path: '/counties', permission: PERMISSIONS.VIEW_CLIENTS },
      { path: '/companies', permission: null }, // Company management for super admins
      { path: '/properties', permission: PERMISSIONS.VIEW_PROPERTIES },
      { path: '/sites', permission: PERMISSIONS.VIEW_PROPERTIES },
      { path: '/applications', permission: PERMISSIONS.VIEW_APPLICATIONS },
      { path: '/housing-support', permission: PERMISSIONS.VIEW_HOUSING_SUPPORT },
      { path: '/vendors', permission: PERMISSIONS.VIEW_VENDORS },
      { path: '/other-subsidies', permission: PERMISSIONS.VIEW_OTHER_SUBSIDIES },
      { path: '/financials', permission: PERMISSIONS.VIEW_TRANSACTIONS },
      { path: '/pool-fund', permission: PERMISSIONS.MANAGE_POOL_FUND },
      { path: '/user-management', permission: PERMISSIONS.MANAGE_USERS },
      { path: '/reports', permission: PERMISSIONS.VIEW_REPORTS },
    ];

    return pages.filter(page => {
      // Special handling for companies page - only super admins
      if (page.path === '/companies') {
        return user?.isSuperAdmin === true;
      }
      // All other pages use normal permission check
      return page.permission === null || hasPermission(page.permission);
    });
  }, [permissionSet, user?.isSuperAdmin]);

  const getAccessiblePages = () => accessiblePages;

  return {
    hasPermission,
    canAccess,
    getAccessiblePages,
    isStaff: !user?.isSuperAdmin,
    isAdmin: user?.isSuperAdmin,
    isLoading,
  };
}