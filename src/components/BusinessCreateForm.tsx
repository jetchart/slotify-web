import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { businessService } from '@/services/business.service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2 } from 'lucide-react';

function sanitizeSlug(value: string): string {
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

export default function BusinessCreateForm() {
  const { setBusinessId } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [timezone, setTimezone] = useState('America/Argentina/Buenos_Aires');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (slugTouched) return;
    setSlug(sanitizeSlug(name));
  }, [name, slugTouched]);

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

    setSaving(true);
    try {
      const business = await businessService.create({
        name: name.trim(),
        slug: cleanedSlug,
        description: description.trim() || undefined,
        timezone,
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
    <div className="space-y-6">
      <div className="rounded-lg border bg-muted/30 p-4 flex gap-3">
        <Building2 className="size-5 text-muted-foreground shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Creá tu negocio para comenzar</p>
          <p>
            Para usar Slotify necesitamos los datos de tu negocio. Una vez creado, podrás configurar
            agendas, horarios y gestionar turnos.
          </p>
        </div>
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
              <Label htmlFor="description">
                Descripción <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej: Canchas de padel y tenis"
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
              <Label htmlFor="timezone">Zona horaria</Label>
              <select
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? 'Creando...' : 'Crear negocio'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
