import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { resourcesService } from '@/services/resources.service';
import { slotsService } from '@/services/slots.service';
import { bookingsService } from '@/services/bookings.service';
import type { Resource, Slot } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';

export default function BookingsPage() {
  const { businessId } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedResource, setSelectedResource] = useState<string>('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellingSlot, setCancellingSlot] = useState<Slot | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [detailsSlot, setDetailsSlot] = useState<Slot | null>(null);

  useEffect(() => {
    if (!businessId) return;
    resourcesService
      .getAll(businessId)
      .then((data) => {
        setResources(data);
        if (data.length > 0) setSelectedResource(String(data[0].id));
      })
      .catch(() => {});
  }, [businessId]);

  const fetchSlots = async () => {
    if (!selectedResource) return;
    setLoading(true);
    try {
      const data = await slotsService.getPublicSlots(Number(selectedResource), date);
      setSlots(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar slots');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedResource && date) fetchSlots();
  }, [selectedResource, date]);

  const openCancelDialog = (slot: Slot) => {
    setCancellingSlot(slot);
    setCancelDialogOpen(true);
  };

  const openDetailsDialog = (slot: Slot) => {
    setDetailsSlot(slot);
    setDetailsDialogOpen(true);
  };

  const handleCancel = async () => {
    if (!cancellingSlot) return;
    setCancelling(true);
    try {
      const bookingId = cancellingSlot.booking?.id;
      if (!bookingId) {
        throw new Error('No se encontró bookingId para cancelar');
      }

      await bookingsService.cancel(bookingId);
      toast.success('Reserva cancelada');
      setCancelDialogOpen(false);
      fetchSlots();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al cancelar');
    } finally {
      setCancelling(false);
    }
  };

  const formatTime = (utc: string) =>
    new Date(utc).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  const formatDate = (utc: string) =>
    new Date(utc).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Reservas</h2>
        <p className="text-sm text-muted-foreground">Visualizá y gestioná las reservas existentes.</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="space-y-2 flex-1">
          <Label>Agenda</Label>
          <Select value={selectedResource} onValueChange={setSelectedResource}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar agenda" />
            </SelectTrigger>
            <SelectContent>
              {resources.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 sm:w-44">
          <Label>Fecha</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full" />
        </div>
      </div>
      
      <p className="text-muted-foreground text-sm">
        Turnos de {selectedResource ? resources.find((r) => String(r.id) === selectedResource)?.slotMinutes : '0'} minutos
      </p>

      {loading ? (
        <p className="text-muted-foreground text-sm">Cargando...</p>
      ) : !selectedResource ? (
        <p className="text-muted-foreground text-sm">Seleccioná una agenda para ver los slots.</p>
      ) : slots.length === 0 ? (
        <p className="text-muted-foreground text-sm">No hay slots para la fecha seleccionada.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Horario</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[120px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slots.map((slot) => (
                <TableRow key={slot.id}>
                  <TableCell>{formatTime(slot.startsAtUtc)}</TableCell>
                  <TableCell>
                    {slot.isBooked ? (
                      <button
                        type="button"
                        className="text-primary underline underline-offset-4 font-medium cursor-pointer"
                        onClick={() => openDetailsDialog(slot)}
                      >
                        {slot.booking?.customer?.name ?? slot.customer?.name ?? 'Reservado'}
                      </button>
                    ) : (
                      <span className="text-muted-foreground text-sm">Libre</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {slot.isBooked && slot.booking?.id && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => openCancelDialog(slot)}
                      >
                        Cancelar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar reserva</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Estás seguro de que querés cancelar esta reserva? Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>Volver</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? 'Cancelando...' : 'Confirmar cancelación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailsDialogOpen} onOpenChange={(open) => {
        setDetailsDialogOpen(open);
        if (!open) setDetailsSlot(null);
      }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Datos de la reserva</DialogTitle>
          </DialogHeader>

          {detailsSlot ? (
            (() => {
              const customer = detailsSlot.booking?.customer ?? detailsSlot.customer;
              return (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nombre</p>
                    <p className="font-medium">{customer?.name ?? '—'}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Turno (día y hora)</p>
                    <p className="font-medium">
                      {formatDate(detailsSlot.startsAtUtc)} - {formatTime(detailsSlot.startsAtUtc)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Mail</p>
                    <p className="font-medium">{customer?.email ?? '—'}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Teléfono</p>
                    <p className="font-medium">{customer?.phone ?? '—'}</p>
                  </div>
                </div>
              );
            })()
          ) : (
            <p className="text-sm text-muted-foreground">No hay datos para mostrar.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
