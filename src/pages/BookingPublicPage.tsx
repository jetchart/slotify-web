import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { slotsService } from '@/services/slots.service';
import { bookingsService } from '@/services/bookings.service';
import type { Slot } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, CalendarDays } from 'lucide-react';

export default function BookingPublicPage() {
  const { resourceId } = useParams<{ resourceId: string }>();
  const resId = Number(resourceId);

  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const [form, setForm] = useState({ customerName: '', customerEmail: '', customerPhone: '' });
  const [booking, setBooking] = useState(false);
  const [success, setSuccess] = useState(false);

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
      await bookingsService.createPublic({
        resourceId: resId,
        slotId: selectedSlot.id,
        customerName: form.customerName,
        customerEmail: form.customerEmail,
        customerPhone: form.customerPhone,
      });
      setSuccess(true);
      toast.success('Turno reservado con éxito');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al reservar');
    } finally {
      setBooking(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <CheckCircle className="size-16 mx-auto text-green-500" />
            <h2 className="text-2xl font-semibold">Turno confirmado</h2>
            <p className="text-muted-foreground">
              Tu turno fue reservado exitosamente. Te enviamos los detalles a <strong>{form.customerEmail}</strong>.
            </p>
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
          <p className="text-center text-muted-foreground text-sm">Cargando horarios...</p>
        ) : slots.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm">No hay horarios disponibles para esta fecha.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {slots.map((slot) => {
              const available = !slot.isBooked && slot.status === 'open';
              const isSelected = selectedSlot?.id === slot.id;
              return (
                <button
                  key={slot.id}
                  disabled={!available}
                  onClick={() => setSelectedSlot(slot)}
                  className={`rounded-lg border p-3 text-sm font-medium transition-all ${
                    !available
                      ? 'opacity-40 cursor-not-allowed bg-muted'
                      : isSelected
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
