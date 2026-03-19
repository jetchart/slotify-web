import { Navigate, Outlet } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { businessService } from '@/services/business.service';

export function AdminRoute() {
  const { isAuthenticated, user, loading, logout, setBusinessId } = useAuth();
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<'unknown' | 'ok' | 'noUser' | 'noBusiness'>('unknown');
  const userId = useMemo(() => user?.email ?? null, [user]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      // Keep hooks order stable: guard inside effect.
      if (loading || !isAuthenticated) {
        setChecking(false);
        setResult('unknown');
        return;
      }

      if (!userId) {
        setChecking(false);
        setResult('noUser');
        return;
      }

      setChecking(true);
      setResult('unknown');

      try {
        const biz = await businessService.getByUserId(userId);
        if (cancelled) return;
        setBusinessId(biz.id);
        setResult('ok');
      } catch (err: unknown) {
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
      } finally {
        if (cancelled) return;
        setChecking(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [loading, isAuthenticated, userId, logout, setBusinessId]);

  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (checking || result === 'unknown') return null;
  if (result === 'noUser') return <Navigate to="/login" replace />;

  return <Outlet />;
}
