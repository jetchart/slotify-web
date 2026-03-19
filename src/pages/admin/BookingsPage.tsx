import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { resourcesService } from '@/services/resources.service';
import { slotsService } from '@/services/slots.service';
import { bookingsService } from '@/services/bookings.service';
import type { Resource, Slot, BookingStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BookingStatusBadge } from '@/components/BookingStatusBadge';
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

  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionSlot, setActionSlot] = useState<Slot | null>(null);
  const [actionType, setActionType] = useState<'confirm' | 'no_show' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [detailsSlot, setDetailsSlot] = useState<Slot | null>(null);

  const [editNotesDialogOpen, setEditNotesDialogOpen] = useState(false);
  const [editNotesSlot, setEditNotesSlot] = useState<Slot | null>(null);
  const [editNotesValue, setEditNotesValue] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

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

  const openActionDialog = (slot: Slot, type: 'confirm' | 'no_show') => {
    setActionSlot(slot);
    setActionType(type);
    setActionDialogOpen(true);
  };

  const handleAction = async () => {
    if (!actionSlot || !actionType) return;
    setActionLoading(true);
    try {
      const bookingId = actionSlot.booking?.id;
      if (!bookingId) {
        throw new Error('No se encontró bookingId');
      }

      const newStatus: BookingStatus = actionType === 'confirm' ? 'confirmed' : 'no_show';
      await bookingsService.updateStatus(bookingId, newStatus);
      toast.success(actionType === 'confirm' ? 'Reserva confirmada' : 'Marcado como ausente');
      setActionDialogOpen(false);
      fetchSlots();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar');
    } finally {
      setActionLoading(false);
    }
  };

  const openEditNotesDialog = (slot: Slot) => {
    setEditNotesSlot(slot);
    setEditNotesValue(slot.booking?.notes || '');
    setEditNotesDialogOpen(true);
  };

  const handleSaveNotes = async () => {
    if (!editNotesSlot) return;
    setSavingNotes(true);
    try {
      const bookingId = editNotesSlot.booking?.id;
      if (!bookingId) {
        throw new Error('No se encontró bookingId');
      }

      await bookingsService.updateNotes(bookingId, editNotesValue);
      toast.success('Notas actualizadas');
      setEditNotesDialogOpen(false);
      fetchSlots();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSavingNotes(false);
    }
  };

  const formatTime = (utc: string) =>
    new Date(utc).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  const formatDate = (utc: string) =>
    new Date(utc).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

  const isPast = (utc: string) => new Date(utc) < new Date();

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
        <p className="text-muted-foreground text-sm">No hay turnos para la fecha seleccionada.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Horario</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[200px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slots.map((slot) => {
                const booking = slot.booking;
                const customer = booking?.customer;
                return (
                  <TableRow key={`${slot.startsAtUtc}-${slot.endsAtUtc}`}>
                    <TableCell>{formatTime(slot.startsAtUtc)}</TableCell>
                    <TableCell>
                      {slot.isBooked ? (
                        <button
                          type="button"
                          className="text-primary underline underline-offset-4 font-medium cursor-pointer"
                          onClick={() => openDetailsDialog(slot)}
                        >
                          {customer?.name ?? 'Reservado'}
                        </button>
                      ) : (
                        <span className="text-muted-foreground text-sm">Libre</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {booking ? (
                        <BookingStatusBadge status={booking.status} />
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {slot.isBooked && booking && (
                        <div className="flex gap-2">
                          {booking.status === 'pending' && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => openActionDialog(slot, 'confirm')}
                            >
                              Confirmar
                            </Button>
                          )}
                          {booking.status === 'confirmed' && !isPast(slot.startsAtUtc) && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => openCancelDialog(slot)}
                            >
                              Cancelar
                            </Button>
                          )}
                          {booking.status === 'confirmed' && isPast(slot.startsAtUtc) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openActionDialog(slot, 'no_show')}
                            >
                              Ausente
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditNotesDialog(slot)}
                          >
                            Notas
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
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
              const booking = detailsSlot.booking;
              const customer = booking?.customer;
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

                  {booking && (
                    <>
                      <div>
                        <p className="text-sm text-muted-foreground">Estado</p>
                        <div className="mt-1">
                          <BookingStatusBadge status={booking.status} />
                        </div>
                      </div>

                      {booking.notes && (
                        <div>
                          <p className="text-sm text-muted-foreground">Notas</p>
                          <p className="font-medium">{booking.notes}</p>
                        </div>
                      )}

                      <div>
                        <p className="text-sm text-muted-foreground">Última modificación</p>
                        <p className="font-medium text-sm">
                          {new Date(booking.updatedAt).toLocaleString('es-AR')}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              );
            })()
          ) : (
            <p className="text-sm text-muted-foreground">No hay datos para mostrar.</p>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'confirm' ? 'Confirmar reserva' : 'Marcar como ausente'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {actionType === 'confirm'
              ? '¿Confirmar esta reserva? El cliente será notificado.'
              : '¿Marcar al cliente como ausente? Esta acción quedará registrada.'}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAction} disabled={actionLoading}>
              {actionLoading ? 'Procesando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editNotesDialogOpen} onOpenChange={setEditNotesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar notas</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="edit-notes">Notas de la reserva</Label>
            <Textarea
              id="edit-notes"
              value={editNotesValue}
              onChange={(e) => setEditNotesValue(e.target.value)}
              placeholder="Agregar notas o comentarios..."
              rows={4}
              maxLength={500}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditNotesDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveNotes} disabled={savingNotes}>
              {savingNotes ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
