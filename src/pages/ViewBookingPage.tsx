import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { bookingsService } from '@/services/bookings.service';
import type { PublicBookingView } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BookingStatusBadge } from '@/components/BookingStatusBadge';
import { CalendarDays, XCircle, ArrowLeft } from 'lucide-react';

function formatTime(utc: string) {
  return new Date(utc).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(utc: string) {
  const d = new Date(utc);
  return d.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function ViewBookingPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const bookingId = id ? parseInt(id, 10) : NaN;

  const [data, setData] = useState<PublicBookingView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!slug || !id || isNaN(bookingId)) {
      setError('Link inválido');
      setLoading(false);
      return;
    }

    let cancelled = false;
    bookingsService
      .getPublic(slug, bookingId)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'No se pudo cargar el turno');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, id, bookingId]);

  const handleCancel = async () => {
    if (!data || cancelling) return;
    if (data.booking.status !== 'pending' && data.booking.status !== 'confirmed') return;

    setCancelling(true);
    try {
      await bookingsService.cancel(data.booking.id);
      setData((d) => (d ? { ...d, booking: { ...d.booking, status: 'cancelled' as const } } : null));
      toast.success('Turno cancelado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cancelar');
    } finally {
      setCancelling(false);
    }
  };

  const canCancel = data && (data.booking.status === 'pending' || data.booking.status === 'confirmed');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-10 w-full mt-6" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <XCircle className="size-12 mx-auto text-destructive" />
            <h2 className="text-xl font-semibold">Turno no encontrado</h2>
            <p className="text-muted-foreground text-sm">{error ?? 'El turno no existe o el link es incorrecto.'}</p>
            <Button asChild variant="outline">
              <Link to="/">Volver al inicio</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-xl">
              {data.business.name}
            </CardTitle>
            <BookingStatusBadge status={data.booking.status} />
          </div>
          <p className="text-sm text-muted-foreground">{data.resource.name}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border p-4">
            <CalendarDays className="size-5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="space-y-1 text-sm">
              <p className="font-medium capitalize">{formatDate(data.booking.startsAtUtc)}</p>
              <p className="text-muted-foreground">
                {formatTime(data.booking.startsAtUtc)} – {formatTime(data.booking.endsAtUtc)}
              </p>
              <p className="text-muted-foreground">A nombre de: {data.customer.name}</p>
            </div>
          </div>

          {data.booking.notes && (
            <div className="text-sm">
              <span className="text-muted-foreground">Notas: </span>
              <span>{data.booking.notes}</span>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2">
            {canCancel && (
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={cancelling}
              >
                {cancelling ? 'Cancelando...' : 'Cancelar turno'}
              </Button>
            )}
            {slug && (
              <Button asChild variant="outline">
                <Link to={`/${slug}`} className="flex items-center gap-2">
                  <ArrowLeft className="size-4" />
                  Reservar otro turno
                </Link>
              </Button>
            )}
            <Button asChild variant="ghost" size="sm">
              <Link to="/">Volver al inicio</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
