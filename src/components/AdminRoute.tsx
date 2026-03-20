import { Navigate, Outlet } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/api';
import { businessService } from '@/services/business.service';
import { Button } from '@/components/ui/button';

export function AdminRoute() {
  const { isAuthenticated, user, loading, logout, setBusinessId } = useAuth();
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<'unknown' | 'ok' | 'noUser' | 'noBusiness' | 'error'>('unknown');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const userId = useMemo(() => user?.email ?? null, [user]);

  const runCheck = useCallback(async () => {
    if (!userId) return;
    setChecking(true);
    setResult('unknown');
    setErrorMessage(null);
    try {
      const biz = await businessService.getByUserId(userId);
      setBusinessId(biz.id);
      setResult('ok');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const status = err instanceof ApiError ? err.status : undefined;

      // 404 en /businesses/by-user → usuario sin negocio
      if (status === 404) {
        setResult('noBusiness');
        return;
      }

      // Cualquier otro error (red, 500, timeout) → no asumir que no tiene negocio
      setResult('error');
      setErrorMessage(message);
    } finally {
      setChecking(false);
    }
  }, [userId, logout, setBusinessId]);

  useEffect(() => {
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

    runCheck();
  }, [loading, isAuthenticated, userId, runCheck]);

  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (checking || result === 'unknown') return null;
  if (result === 'noUser') return <Navigate to="/login" replace />;

  if (result === 'error') {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6">
        <p className="text-muted-foreground text-center mb-4">
          No se pudo cargar tu negocio. {errorMessage}
        </p>
        <Button onClick={runCheck}>Reintentar</Button>
      </div>
    );
  }

  return <Outlet />;
}
