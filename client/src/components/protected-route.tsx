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
  const { hasPermission, isAdmin } = usePermissions();

  // If super admin access is required
  if (requireSuperAdmin && !isAdmin) {
    return <NotFound />;
  }

  // If specific permission is required
  if (permission && !hasPermission(permission)) {
    return <NotFound />;
  }

  return <>{children}</>;
}