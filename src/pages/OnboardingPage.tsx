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

function sanitizeSlug(value: string): string {
  // Solo letras, números y guiones medios.
  // Convertimos tildes/diacríticos a ASCII y normalizamos separadores a `-`.
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);
}

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
          navigate('/', { replace: true });
        }
      }
    })();
  }, [isAuthenticated, user, logout, navigate, setBusinessId]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [timezone, setTimezone] = useState('America/Argentina/Buenos_Aires');
  const [maxBookingWindowDays, setMaxBookingWindowDays] = useState(30);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (slugTouched) return;
    setSlug(sanitizeSlug(name));
  }, [name, slugTouched]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }

    const cleanedSlug = sanitizeSlug(slug);
    if (!cleanedSlug) {
      toast.error('El identificador (slug) es obligatorio');
      return;
    }
    if (!/^[a-z0-9-]{1,30}$/.test(cleanedSlug)) {
      toast.error('El identificador solo puede contener letras, números y guiones medios');
      return;
    }
    const days = Number(maxBookingWindowDays);
    if (!Number.isInteger(days) || days < 1 || days > 180) {
      toast.error('Los días máximos de reserva deben ser un número entero entre 1 y 180');
      return;
    }

    setSaving(true);
    try {
      const business = await businessService.create({
        name: name.trim(),
        slug: cleanedSlug,
        description: description.trim(),
        timezone,
        maxBookingWindowDays: days,
      });
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
                <Label htmlFor="description">Descripción</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ej: Canchas de padel y tenis"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Identificador (slug)</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(sanitizeSlug(e.target.value));
                  }}
                  placeholder="Ej: club-deportivo-el-prado"
                  required
                  maxLength={30}
                  pattern="^[A-Za-z0-9-]{1,30}$"
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  Solo letras, números y guiones medios. Máximo 30 caracteres.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxBookingWindowDays">Días máximos de reserva</Label>
                <Input
                  id="maxBookingWindowDays"
                  type="number"
                  min={1}
                  value={maxBookingWindowDays}
                  onChange={(e) => setMaxBookingWindowDays(Number(e.target.value) || 30)}
                  placeholder="30"
                />
                <p className="text-xs text-muted-foreground">
                  Hasta cuántos días en el futuro se pueden reservar turnos. Por defecto: 30.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Zona horaria</Label>
                <select
                  id="timezone"
                  value={timezone}
                  disabled
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
          <button onClick={handleLogout} className="underline hover:text-foreground transition-colors">
            Cerrar sesión
          </button>
        </p>
      </div>
    </div>
  );
}
