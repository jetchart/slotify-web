import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { resourcesService } from '@/services/resources.service';
import { slotsService } from '@/services/slots.service';
import { bookingsService } from '@/services/bookings.service';
import type { Resource, Slot } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, ChevronLeft, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { businessService } from '@/services/business.service';

const CUSTOMER_STORAGE_KEY = 'bookingCustomerData';

type Step = 'slot' | 'form' | 'success';

interface CustomerData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes?: string;
}

function loadCustomerData(): CustomerData {
  try {
    const stored = localStorage.getItem(CUSTOMER_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return { customerName: '', customerEmail: '', customerPhone: '', notes: '' };
}

function saveCustomerData(data: CustomerData) {
  localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(data));
}

function getTodayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function BusinessBookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [bId, setBId] = useState<number | null>(null);
  const [businessName, setBusinessName] = useState<string | null>(null);

  const [step, setStep] = useState<Step>('slot');
  const [resources, setResources] = useState<Resource[]>([]);
  const [loadingResources, setLoadingResources] = useState(true);
  const [selectedResourceId, setSelectedResourceId] = useState<string>('');

  const selectedResource = resources.find((r) => String(r.id) === selectedResourceId) ?? null;

  const [date, setDate] = useState(getTodayLocal);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const [form, setForm] = useState<CustomerData>(loadCustomerData);
  const [booking, setBooking] = useState(false);
  const [bookedSlot, setBookedSlot] = useState<Slot | null>(null);

  // Resolve the business id from slug (public booking routes)
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!slug) {
        setBId(null);
        setBusinessName(null);
        return;
      }
      try {
        const biz = await businessService.getBySlug(slug);
        if (cancelled) return;
        setBId(biz.id);
        setBusinessName(biz.name);
      } catch {
        if (cancelled) return;
        toast.error('No se encontró el negocio');
        setBId(null);
        setBusinessName(null);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Load resources
  useEffect(() => {
    if (!bId) {
      setResources([]);
      setSelectedResourceId('');
      setLoadingResources(false);
      return;
    }

    setLoadingResources(true);

    const load = async () => {
      try {
        const data = await resourcesService.getPublic(bId);
        setResources(data);
        if (data.length > 0) setSelectedResourceId(String(data[0].id));
      } catch {
        toast.error('No se pudieron cargar las agendas');
      } finally {
        setLoadingResources(false);
      }
    };
    load();
  }, [bId]);

  // Load slots when resource or date changes
  useEffect(() => {
    if (!selectedResource) return;
    const load = async () => {
      setLoadingSlots(true);
      setSlots([]);
      setSelectedSlot(null);
      try {
        const data = await slotsService.getPublicSlots(selectedResource.id, date);
        setSlots(data);
      } catch {
        toast.error('No se pudieron cargar los turnos');
      } finally {
        setLoadingSlots(false);
      }
    };
    load();
  }, [selectedResource, date]);

  const handleSelectSlot = (slot: Slot) => {
    setSelectedSlot(slot);
    setStep('form');
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResource || !selectedSlot) return;
    setBooking(true);
    try {
      await bookingsService.createPublic({
        resourceId: selectedResource.id,
        startsAtUtc: selectedSlot.startsAtUtc,
        endsAtUtc: selectedSlot.endsAtUtc,
        customerName: form.customerName.trim(),
        customerEmail: form.customerEmail.trim(),
        customerPhone: form.customerPhone.trim(),
        notes: form.notes?.trim(),
      });
      saveCustomerData(form);
      setBookedSlot(selectedSlot);
      setStep('success');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al reservar');
    } finally {
      setBooking(false);
    }
  };

  const handleReset = () => {
    setSelectedSlot(null);
    setBookedSlot(null);
    setStep('slot');
  };

  const formatTime = (utc: string) =>
    new Date(utc).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  const formatDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

  const steps: Step[] = ['slot', 'form'];
  const stepIndex = steps.indexOf(step);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          {step === 'form' && (
            <Button variant="ghost" size="icon" onClick={() => setStep('slot')}>
              <ChevronLeft className="size-5" />
            </Button>
          )}
          <div>
            <h1 className="font-semibold text-lg">
              Reservar turno en {businessName ?? '—'}
            </h1>
            {selectedResource && step !== 'slot' && (
              <p className="text-sm text-muted-foreground">{selectedResource.name}</p>
            )}
          </div>
        </div>
        {step !== 'success' && (
          <div className="max-w-2xl mx-auto px-4 pb-3 flex gap-1">
            {steps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors',
                  i <= stepIndex ? 'bg-primary' : 'bg-muted',
                )}
              />
            ))}
          </div>
        )}
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Step 1: Resource + date + slot */}
        {step === 'slot' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold">Elegí fecha y horario</h2>
            </div>

            {/* Resource selector + date picker */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 space-y-1">
                <Label>Agenda</Label>
                {loadingResources ? (
                  <div className="h-9 rounded-md bg-muted animate-pulse" />
                ) : (
                  <Select
                    value={selectedResourceId}
                    onValueChange={(v) => { setSelectedResourceId(v); setSelectedSlot(null); }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccioná una agenda" />
                    </SelectTrigger>
                    <SelectContent>
                      {resources.map((r) => (
                        <SelectItem key={r.id} value={String(r.id)}>
                          {r.name} ({r.slotMinutes})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-1">
                <Label className="flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" />
                  Fecha
                </Label>
                <Input
                  type="date"
                  value={date}
                  min={getTodayLocal()}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            {selectedResource && (
              <p className="text-sm text-muted-foreground capitalize">
                {formatDate(date)}
              </p>
            )}

            {/* Slots grid */}
            {!selectedResource ? null : loadingSlots ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-11 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : slots.length === 0 ? (
              <p className="text-muted-foreground text-sm">No hay turnos para esta fecha.</p>
            ) : (
              <>
                {slots.filter((s) => !s.isBooked).length === 0 && slots.length > 0 && (
                  <p className="text-muted-foreground text-sm">Todos los turnos están ocupados para esta fecha.</p>
                )}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {slots
                    .filter((slot) => !slot.isBooked)
                    .map((slot) => (
                      <button
                        key={`${slot.startsAtUtc}-${slot.endsAtUtc}`}
                        onClick={() => handleSelectSlot(slot)}
                        className={cn(
                          'rounded-lg border p-3 text-sm font-medium transition-all',
                          'hover:border-primary hover:bg-accent cursor-pointer',
                        )}
                      >
                        {formatTime(slot.startsAtUtc)}
                      </button>
                    ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 2: Customer form */}
        {step === 'form' && selectedSlot && selectedResource && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold">Tus datos</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Confirmá tu información para reservar el turno.
              </p>
            </div>

            {/* Summary */}
            <div className="rounded-xl border bg-muted/40 p-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Agenda</span>
                <span className="font-medium">{selectedResource.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fecha</span>
                <span className="font-medium capitalize">{formatDate(date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Horario</span>
                <span className="font-medium">
                  {formatTime(selectedSlot.startsAtUtc)} – {formatTime(selectedSlot.endsAtUtc)}
                </span>
              </div>
            </div>

            <form onSubmit={handleBook} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Nombre completo</Label>
                <Input
                  id="customerName"
                  value={form.customerName}
                  onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
                  placeholder="Juan Pérez"
                  required
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
                  required
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
                  required
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
              <Button type="submit" className="w-full" size="lg" disabled={booking}>
                {booking ? 'Confirmando...' : 'Confirmar turno'}
              </Button>
            </form>
          </div>
        )}

        {/* Success */}
        {step === 'success' && bookedSlot && selectedResource && (
          <div className="flex flex-col items-center text-center space-y-5 py-8">
            <div className="rounded-full bg-green-100 dark:bg-green-950 p-5">
              <CheckCircle className="size-12 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Turno confirmado</h2>
              <p className="text-muted-foreground">Tu reserva fue registrada exitosamente.</p>
            </div>
            <div className="rounded-xl border bg-muted/40 p-5 w-full max-w-sm space-y-2 text-sm text-left">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Agenda</span>
                <span className="font-medium">{selectedResource.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fecha</span>
                <span className="font-medium capitalize">{formatDate(date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Horario</span>
                <span className="font-medium">
                  {formatTime(bookedSlot.startsAtUtc)} – {formatTime(bookedSlot.endsAtUtc)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">A nombre de</span>
                <span className="font-medium">{form.customerName}</span>
              </div>
            </div>
            <Button variant="outline" onClick={handleReset}>
              Reservar otro turno
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
