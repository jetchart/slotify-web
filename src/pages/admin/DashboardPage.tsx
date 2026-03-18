import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Box, CalendarDays, Users, Building2 } from 'lucide-react';

const sections = [
  {
    title: 'Mi Negocio',
    description: 'Configurá nombre y reglas base de tu negocio.',
    icon: Building2,
    to: '/admin/business',
  },
  {
    title: 'Agendas',
    description: 'Creá y gestioná canchas, salas u otras agendas reservables.',
    icon: Box,
    to: '/admin/resources',
  },
  {
    title: 'Reservas',
    description: 'Visualizá las reservas existentes y cancelá si es necesario.',
    icon: CalendarDays,
    to: '/admin/bookings',
  },
  {
    title: 'Usuarios',
    description: 'Consultá el listado de administradores y usuarios registrados.',
    icon: Users,
    to: '/admin/users',
  },
];

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const visibleSections = isAdmin === true
    ? sections
    : sections.filter((section) => section.to !== '/admin/users');

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Hola, {user?.givenName ?? user?.name ?? 'Admin'}
        </h2>
        <p className="text-sm text-muted-foreground">
          Bienvenido al panel de administración de Slotify.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {visibleSections.map(({ title, description, icon: Icon, to }) => (
          <Card key={to} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(to)}>
            <CardHeader className="flex flex-row items-start gap-4 space-y-0">
              <div className="rounded-md bg-primary/10 p-2">
                <Icon className="size-5 text-primary" />
              </div>
              <div className="flex-1 space-y-1">
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
