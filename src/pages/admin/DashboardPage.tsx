import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { bookingsService } from '@/services/bookings.service';
import { resourcesService } from '@/services/resources.service';
import type { Booking, Resource } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Box,
  CalendarDays,
  Users,
  Building2,
  CalendarCheck,
  Calendar,
  UserX,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
} from 'lucide-react';

const sections = [
  {
    title: 'Mi Negocio',
    description: 'Configurá nombre, horarios base, excepciones y bloqueos del negocio.',
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
    title: 'Resumen disponibilidad',
    description: 'Vista consolidada de cómo quedaron configuradas las agendas y sus turnos.',
    icon: CalendarCheck,
    to: '/admin/availability-summary',
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

function getTodayRange() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const today = `${y}-${m}-${day}`;
  return { from: today, to: today };
}

function getMonthRange() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const firstDay = `${y}-${m}-01`;
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const lastDayStr = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
  return { from: firstDay, to: lastDayStr };
}

function formatTime(utc: string) {
  return new Date(utc).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

interface Stats {
  total: number;
  noShow: number;
  confirmed: number;
  pending: number;
  cancelled: number;
}

function computeStats(bookings: Booking[]): Stats {
  const stats: Stats = {
    total: 0,
    noShow: 0,
    confirmed: 0,
    pending: 0,
    cancelled: 0,
  };
  for (const b of bookings) {
    stats.total++;
    if (b.status === 'no_show') stats.noShow++;
    else if (b.status === 'confirmed') stats.confirmed++;
    else if (b.status === 'pending') stats.pending++;
    else if (b.status === 'cancelled') stats.cancelled++;
  }
  return stats;
}

function StatCard({
  label,
  value,
  icon: Icon,
  variant = 'default',
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  variant?: 'default' | 'muted' | 'destructive';
}) {
  const variantClasses = {
    default: 'bg-primary/10 text-primary',
    muted: 'bg-muted text-muted-foreground',
    destructive: 'bg-destructive/10 text-destructive',
  };
  return (
    <div className="rounded-lg border p-3 flex items-center gap-3">
      <div className={`rounded-md p-2 ${variantClasses[variant]}`}>
        <Icon className="size-4" />
      </div>
      <div>
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, isAdmin, businessId } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const [monthBookings, setMonthBookings] = useState<Booking[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);

  const visibleSections = isAdmin === true
    ? sections
    : sections.filter((section) => section.to !== '/admin/users');

  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const today = getTodayRange();
        const month = getMonthRange();
        const [todayData, monthData, resourcesData] = await Promise.all([
          bookingsService.getAll({ businessId, from: today.from, to: today.to }),
          bookingsService.getAll({ businessId, from: month.from, to: month.to }),
          resourcesService.getAll(businessId),
        ]);
        setTodayBookings(todayData);
        setMonthBookings(monthData);
        setResources(resourcesData);
      } catch {
        setTodayBookings([]);
        setMonthBookings([]);
        setResources([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [businessId]);

  const todayStats = computeStats(todayBookings);
  const monthStats = computeStats(monthBookings);

  const totalForNoShowRate = monthStats.total - monthStats.cancelled;
  const noShowRate =
    totalForNoShowRate > 0 ? ((monthStats.noShow / totalForNoShowRate) * 100).toFixed(1) : '0';

  const now = new Date();
  const upcomingToday = todayBookings
    .filter((b) => b.status !== 'cancelled' && new Date(b.startsAtUtc) > now)
    .sort((a, b) => new Date(a.startsAtUtc).getTime() - new Date(b.startsAtUtc).getTime())
    .slice(0, 5);

  const resourceMap = new Map(resources.map((r) => [r.id, r.name]));

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

      {loading ? (
        <div className="space-y-6">
          <div>
            <Skeleton className="h-6 w-48 mb-3" />
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-lg border p-3 flex items-center gap-3">
                  <Skeleton className="size-8 rounded-md" />
                  <div className="space-y-2">
                    <Skeleton className="h-7 w-10" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <Skeleton className="h-6 w-52 mb-3" />
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-lg border p-3 flex items-center gap-3">
                  <Skeleton className="size-8 rounded-md" />
                  <div className="space-y-2">
                    <Skeleton className="h-7 w-10" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-64 mt-2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex gap-3">
                      <Skeleton className="h-4 w-12" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                ))}
              </div>
              <Skeleton className="h-4 w-32 mt-3" />
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          {/* Hoy */}
          <div>
            <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
              <Calendar className="size-5" />
              Resumen de turnos de hoy
            </h3>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              <StatCard label="Total" value={todayStats.total} icon={CalendarDays} />
              <StatCard label="Ausentes" value={todayStats.noShow} icon={UserX} variant="destructive" />
              <StatCard label="Confirmados" value={todayStats.confirmed} icon={CheckCircle} />
              <StatCard label="Pendientes" value={todayStats.pending} icon={Clock} variant="muted" />
              <StatCard label="Cancelados" value={todayStats.cancelled} icon={XCircle} variant="destructive" />
            </div>
          </div>

          {/* Este mes */}
          <div>
            <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
              <Calendar className="size-5" />
              Resumen de turnos del mes
            </h3>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              <StatCard label="Total" value={monthStats.total} icon={CalendarDays} />
              <StatCard label="Ausentes" value={monthStats.noShow} icon={UserX} variant="destructive" />
              <StatCard label="Confirmados" value={monthStats.confirmed} icon={CheckCircle} />
              <StatCard label="Pendientes" value={monthStats.pending} icon={Clock} variant="muted" />
              <StatCard label="Cancelados" value={monthStats.cancelled} icon={XCircle} variant="destructive" />
            </div>
            {totalForNoShowRate > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Tasa de ausencia: <span className="font-medium">{noShowRate}%</span>
              </p>
            )}
          </div>

          {/* Próximos turnos hoy */}
          {upcomingToday.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="size-4" />
                  Próximos turnos hoy
                </CardTitle>
                <CardDescription>
                  Los siguientes turnos que tenés por delante.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {upcomingToday.map((b) => (
                    <li
                      key={b.id}
                      className="flex items-center justify-between py-2 border-b last:border-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium tabular-nums">{formatTime(b.startsAtUtc)}</span>
                        <span className="text-muted-foreground">
                          [{resourceMap.get(b.resourceId) ?? `Agenda ${b.resourceId}`}]
                        </span>
                        <span className="font-medium">{b.customer?.name ?? '—'}</span>
                      </div>
                      <Badge
                        variant={b.status === 'pending' ? 'secondary' : 'default'}
                        className="text-xs"
                      >
                        {b.status === 'pending' ? 'Pendiente' : 'Confirmado'}
                      </Badge>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => navigate('/admin/bookings')}
                  className="text-sm text-primary hover:underline mt-3"
                >
                  Ver todos los turnos →
                </button>
              </CardContent>
            </Card>
          )}

          {/* Alerta pendientes */}
          {todayStats.pending > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 flex gap-3">
              <AlertCircle className="size-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  Tenés {todayStats.pending} turno{todayStats.pending > 1 ? 's' : ''} pendiente
                  {todayStats.pending > 1 ? 's' : ''} de confirmar hoy.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/admin/bookings')}
                  className="text-sm text-amber-700 dark:text-amber-300 hover:underline mt-1"
                >
                  Ir a Reservas →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
