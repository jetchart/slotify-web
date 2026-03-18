import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { businessService } from '@/services/business.service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2 } from 'lucide-react';

const TIMEZONES = [
  'America/Argentina/Buenos_Aires',
  'America/Argentina/Cordoba',
  'America/Argentina/Mendoza',
  'America/Argentina/Rosario',
  'America/Sao_Paulo',
  'America/Santiago',
  'America/Bogota',
  'America/Lima',
  'America/Mexico_City',
  'America/New_York',
  'Europe/Madrid',
  'UTC',
];

export default function OnboardingPage() {
  const { setBusinessId, logout, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    (async () => {
      try {
        const biz = await businessService.getByUserId(user.email);
        setBusinessId(biz.id);
        navigate('/admin', { replace: true });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes('User not found')) {
          logout();
          navigate('/login', { replace: true });
        }
      }
    })();
  }, [isAuthenticated, user, logout, navigate, setBusinessId]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [timezone, setTimezone] = useState('America/Argentina/Buenos_Aires');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    setSaving(true);
    try {
      const business = await businessService.create({ name: name.trim(), description: description.trim() || undefined, timezone });
      setBusinessId(business.id);
      navigate('/admin', { replace: true });
      toast.success('¡Negocio creado exitosamente!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al crear el negocio');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-4">
              <Building2 className="size-8 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Configurá tu negocio</h1>
          <p className="text-muted-foreground text-sm">
            Para empezar a usar Slotify, primero necesitamos los datos de tu negocio.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos del negocio</CardTitle>
            <CardDescription>Podés editar esta información más adelante.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Club Deportivo El Prado"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción <span className="text-muted-foreground">(opcional)</span></Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ej: Canchas de padel y tenis"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Zona horaria</Label>
                <select
                  id="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>

              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? 'Creando...' : 'Crear negocio'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          ¿Cuenta incorrecta?{' '}
          <button onClick={logout} className="underline hover:text-foreground transition-colors">
            Cerrar sesión
          </button>
        </p>
      </div>
    </div>
  );
}
