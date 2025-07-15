import { usePermissions } from '@/hooks/use-permissions';
import { Permission } from '@shared/schema';
import NotFound from '@/pages/not-found';

interface ProtectedRouteProps {
  children: React.ReactNode;
  permission?: Permission;
  requireSuperAdmin?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  permission, 
  requireSuperAdmin = false 
}: ProtectedRouteProps) {
  const { hasPermission, isAdmin, isLoading } = usePermissions();

  // Debug logging
  console.log("ProtectedRoute:", { requireSuperAdmin, isAdmin, permission, isLoading });

  // Show loading while checking permissions
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If super admin access is required
  if (requireSuperAdmin && !isAdmin) {
    console.log("Access denied: Super admin required but user is not admin");
    return <NotFound />;
  }

  // If specific permission is required
  if (permission && !hasPermission(permission)) {
    console.log("Access denied: Missing permission", permission);
    return <NotFound />;
  }

  return <>{children}</>;
}