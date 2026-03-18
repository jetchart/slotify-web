import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) {
    // El guard de admin resuelve si hay business o si hay que ir a onboarding.
    return <Navigate to="/admin" replace />;
  }

  const handleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) return;
    setLoading(true);
    setError(null);
    try {
      await login(credentialResponse.credential);
      // No llamar navigate() acá — cuando login() actualiza el contexto,
      // este componente re-renderiza y el if(isAuthenticated) de arriba redirige
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm border-none shadow-none bg-transparent">
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-center text-lg font-medium">
            <div className="flex flex-col items-center gap-6">
              <img src="/slotify.png" alt="Slotify Logo" className="h-24 w-auto" />
              Bienvenido
            </div>
            </CardTitle>
          <CardDescription className="text-center">Iniciá sesión para continuar</CardDescription>
        </CardHeader>
        <CardContent className="p-0 flex flex-col items-center">
          {error && (
            <div className="mb-3 text-red-500 text-sm text-center w-full">{error}</div>
          )}
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => setError('Error en el login de Google')}
            theme="outline"
            shape="rectangular"
            text="signin_with"
          />
          {loading && (
            <div className="mt-3 text-muted-foreground text-xs">Cargando...</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
