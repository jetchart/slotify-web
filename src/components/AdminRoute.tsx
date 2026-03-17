import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export function AdminRoute() {
  const { isAuthenticated, businessId, loading } = useAuth();

  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!businessId) return <Navigate to="/onboarding" replace />;

  return <Outlet />;
}
