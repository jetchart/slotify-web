import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useAvailability } from '@/context/AvailabilityContext';

/** Redirige a /admin/business cuando no hay negocio creado. */
export function RequireBusiness({ children }: { children: React.ReactNode }) {
  const { businessId } = useAuth();
  if (!businessId) return <Navigate to="/admin/business" replace />;
  return <>{children}</>;
}

/** Redirige a /admin/business cuando no hay días/horarios definidos en Mi Negocio. */
export function RequireAvailability({ children }: { children: React.ReactNode }) {
  const { businessId } = useAuth();
  const { hasBusinessAvailability } = useAvailability();

  if (!businessId) return <>{children}</>;
  if (hasBusinessAvailability === null) return null;
  if (!hasBusinessAvailability) return <Navigate to="/admin/business" replace />;
  return <>{children}</>;
}
