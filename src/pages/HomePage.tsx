import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Calendar, Store, ArrowRight } from 'lucide-react';

function sanitizeSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [bookDialogOpen, setBookDialogOpen] = useState(false);
  const [slugInput, setSlugInput] = useState('');

  const handleReservar = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = sanitizeSlug(slugInput);
    if (!cleaned) return;
    setBookDialogOpen(false);
    setSlugInput('');
    navigate(`/${cleaned}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-muted/30 to-background">
      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 sm:py-24">
        <div className="w-full max-w-2xl mx-auto text-center space-y-8">
          <div className="flex justify-center">
            <img src="/slotify.png" alt="Slotify" className="h-20 w-auto sm:h-24" />
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
              Gestioná turnos de forma simple
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Slotify te permite configurar horarios, agendas y excepciones. Tus clientes reservan
              en segundos desde un link único.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link to={isAuthenticated ? '/admin/business' : '/login'}>
                <Store className="size-4 mr-2" />
                {isAuthenticated ? 'Mi Negocio' : 'Crear Mi Negocio'}
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => setBookDialogOpen(true)}
            >
              <Calendar className="size-4 mr-2" />
              Reservar un turno
              <ArrowRight className="size-4 ml-2" />
            </Button>
          </div>
        </div>
      </main>

      {/* Slug dialog */}
      <Dialog open={bookDialogOpen} onOpenChange={setBookDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reservar un turno</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleReservar} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="slug">Identificador del negocio</Label>
              <Input
                id="slug"
                value={slugInput}
                onChange={(e) => setSlugInput(e.target.value)}
                placeholder="Ej: club-deportivo-el-prado"
                autoComplete="off"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Ingresá el identificador que te dio el negocio. Suele estar en la URL de reservas.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setBookDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!slugInput.trim()}>
                Ir a reservar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
