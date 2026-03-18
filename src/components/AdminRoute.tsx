import { Navigate, Outlet } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { businessService } from '@/services/business.service';

export function AdminRoute() {
  const { isAuthenticated, user, loading, logout, setBusinessId } = useAuth();
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<'unknown' | 'ok' | 'noUser' | 'noBusiness'>('unknown');
  const userId = useMemo(() => user?.email ?? null, [user]);

  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setResult('noUser');
      return;
    }

    setChecking(true);
    setResult('unknown');

    businessService
      .getByUserId(userId)
      .then((biz) => {
        if (cancelled) return;
        setBusinessId(biz.id);
        setResult('ok');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);

        // Backend NotFound messages:
        // - "User not found"
        // - "Business not found"
        if (message.includes('User not found')) {
          logout();
          setResult('noUser');
          return;
        }

        setResult('noBusiness');
      })
      .finally(() => {
        if (cancelled) return;
        setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, logout, setBusinessId]);

  if (checking || result === 'unknown') return null;
  if (result === 'noUser') return <Navigate to="/login" replace />;
  if (result === 'noBusiness') return <Navigate to="/onboarding" replace />;

  return <Outlet />;
}
