import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { slotsService } from '@/services/slots.service';
import { bookingsService } from '@/services/bookings.service';
import type { Slot } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, CalendarDays, XCircle } from 'lucide-react';

export default function BookingPublicPage() {
  const { resourceId } = useParams<{ resourceId: string }>();
  const resId = Number(resourceId);

  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const [form, setForm] = useState({ customerName: '', customerEmail: '', customerPhone: '', notes: '' });
  const [booking, setBooking] = useState(false);
  const [success, setSuccess] = useState(false);
  const [bookedId, setBookedId] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  const fetchSlots = async () => {
    setLoading(true);
    setSelectedSlot(null);
    try {
      const data = await slotsService.getPublicSlots(resId, date);
      setSlots(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar horarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (resId && date) fetchSlots();
  }, [resId, date]);

  const formatTime = (utc: string) =>
    new Date(utc).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  const handleBook = async () => {
    if (!selectedSlot) return;
    if (!form.customerName.trim() || !form.customerEmail.trim() || !form.customerPhone.trim()) {
      toast.error('Completá todos los campos');
      return;
    }
    setBooking(true);
    try {
      const created = await bookingsService.createPublic({
        resourceId: resId,
        startsAtUtc: selectedSlot.startsAtUtc,
        endsAtUtc: selectedSlot.endsAtUtc,
        customerName: form.customerName,
        customerEmail: form.customerEmail,
        customerPhone: form.customerPhone,
        notes: form.notes?.trim(),
      });
      setBookedId(created.id);
      setCancelled(false);
      setSuccess(true);
      toast.success('Turno reservado con éxito');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al reservar');
    } finally {
      setBooking(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!bookedId) return;
    setCancelling(true);
    try {
      await bookingsService.cancel(bookedId);
      setCancelled(true);
      toast.success('Turno cancelado');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al cancelar');
    } finally {
      setCancelling(false);
    }
  };

  const handleReset = () => {
    setSuccess(false);
    setBookedId(null);
    setSelectedSlot(null);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            {cancelled ? (
              <XCircle className="size-16 mx-auto text-muted-foreground" />
            ) : (
              <CheckCircle className="size-16 mx-auto text-green-500" />
            )}
            <h2 className="text-2xl font-semibold">
              {cancelled ? 'Turno cancelado' : 'Turno confirmado'}
            </h2>
            <p className="text-muted-foreground">
              {cancelled
                ? 'La reserva fue cancelada correctamente.'
                : `Tu turno fue reservado exitosamente. Te enviamos los detalles a ${form.customerEmail}.`}
            </p>
            {!cancelled && (
              <Button
                variant="destructive"
                onClick={handleCancelBooking}
                disabled={cancelling}
              >
                {cancelling ? 'Cancelando...' : 'Cancelar turno'}
              </Button>
            )}
            <Button variant="outline" onClick={handleReset} className="w-full">
              Reservar otro turno
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Reservar turno</h1>
          <p className="text-muted-foreground">Elegí un horario disponible y completá tus datos.</p>
        </div>

        <div className="flex items-center gap-3 justify-center">
          <CalendarDays className="size-5 text-muted-foreground" />
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-auto"
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        ) : slots.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm">No hay horarios disponibles para esta fecha.</p>
        ) : slots.every((s) => s.isBooked) ? (
          <p className="text-center text-muted-foreground text-sm">Todos los turnos están ocupados para esta fecha.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {slots
              .filter((slot) => !slot.isBooked)
              .map((slot) => {
                const isSelected =
                  selectedSlot?.startsAtUtc === slot.startsAtUtc &&
                  selectedSlot?.endsAtUtc === slot.endsAtUtc;
                return (
                  <button
                    key={`${slot.startsAtUtc}-${slot.endsAtUtc}`}
                    onClick={() => setSelectedSlot(slot)}
                  className={`rounded-lg border p-3 text-sm font-medium transition-all ${
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'hover:border-primary/50 hover:bg-accent cursor-pointer'
                  }`}
                >
                  {formatTime(slot.startsAtUtc)}
                </button>
              );
            })}
          </div>
        )}

        {selectedSlot && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tus datos</CardTitle>
              <CardDescription>
                Turno seleccionado: {formatTime(selectedSlot.startsAtUtc)} – {formatTime(selectedSlot.endsAtUtc)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Nombre completo</Label>
                <Input
                  id="customerName"
                  value={form.customerName}
                  onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
                  placeholder="Juan Pérez"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerEmail">Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={form.customerEmail}
                  onChange={(e) => setForm((f) => ({ ...f, customerEmail: e.target.value }))}
                  placeholder="juan@ejemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPhone">Teléfono</Label>
                <Input
                  id="customerPhone"
                  type="tel"
                  value={form.customerPhone}
                  onChange={(e) => setForm((f) => ({ ...f, customerPhone: e.target.value }))}
                  placeholder="+54 11 1234-5678"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notas (opcional)</Label>
                <Textarea
                  id="notes"
                  value={form.notes || ''}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Agregar información adicional..."
                  rows={3}
                  maxLength={500}
                />
              </div>
              <Button onClick={handleBook} disabled={booking} className="w-full">
                {booking ? 'Reservando...' : 'Confirmar turno'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
