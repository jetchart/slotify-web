import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { exceptionsService, type CreateExceptionDto } from '@/services/exceptions.service';
import { resourcesService } from '@/services/resources.service';
import type { Exception, Resource } from '@/types';
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
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, CalendarOff, Clock } from 'lucide-react';

export default function ExceptionsPage() {
  const { businessId } = useAuth();
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CreateExceptionDto>({
    businessId: businessId || 0,
    dateFrom: '',
    dateTo: '',
    isClosed: true,
    isBlockedRange: false,
    startTime: null,
    endTime: null,
    resourceId: null,
  });
  const [saving, setSaving] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingException, setDeletingException] = useState<Exception | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    
    Promise.all([
      loadExceptions(),
      resourcesService.getAll(businessId).then(setResources),
    ]).catch(() => {});
  }, [businessId]);

  const loadExceptions = async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const data = await exceptionsService.getAll(businessId);
      setExceptions(data.sort((a, b) => a.dateFrom.localeCompare(b.dateFrom)));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar excepciones');
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setForm({
      businessId: businessId || 0,
      dateFrom: '',
      dateTo: '',
      isClosed: true,
      isBlockedRange: false,
      startTime: null,
      endTime: null,
      resourceId: null,
    });
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!businessId || !form.dateFrom || !form.dateTo) {
      toast.error('Completá las fechas de inicio y fin');
      return;
    }

    if (form.dateFrom > form.dateTo) {
      toast.error('La fecha de fin debe ser mayor o igual a la de inicio');
      return;
    }

    if (form.isBlockedRange && (!form.startTime || !form.endTime)) {
      toast.error('Completá los horarios para el rango');
      return;
    }

    const payload: CreateExceptionDto = {
      ...form,
      businessId,
    };
    if (form.isBlockedRange && form.startTime && form.endTime) {
      payload.startTime = form.startTime.length === 5 ? `${form.startTime}:00` : form.startTime;
      payload.endTime = form.endTime.length === 5 ? `${form.endTime}:00` : form.endTime;
    }

    setSaving(true);
    try {
      await exceptionsService.create(payload);
      toast.success('Excepción creada');
      setDialogOpen(false);
      loadExceptions();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al crear');
    } finally {
      setSaving(false);
    }
  };

  const openDeleteDialog = (exception: Exception) => {
    setDeletingException(exception);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!businessId || !deletingException) return;
    setDeleting(true);
    try {
      await exceptionsService.delete(businessId, deletingException.id);
      toast.success('Excepción eliminada');
      setDeleteDialogOpen(false);
      loadExceptions();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const formatDateRange = (dateFrom: string, dateTo: string) => {
    if (dateFrom === dateTo) return formatDate(dateFrom);
    return `${formatDate(dateFrom)} - ${formatDate(dateTo)}`;
  };

  const getResourceName = (resourceId: number | null | undefined) => {
    if (!resourceId) return 'Todas las agendas';
    return resources.find((r) => r.id === resourceId)?.name ?? '—';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Excepciones</h2>
          <p className="text-sm text-muted-foreground">
            Gestioná excepciones como feriados, vacaciones, horarios especiales, etc.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="size-4 mr-2" />
          Nueva excepción
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Cargando...</p>
      ) : exceptions.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <CalendarOff className="size-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm">
            No hay excepciones configuradas
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Horarios</TableHead>
                <TableHead>Aplica a</TableHead>
                <TableHead className="w-[100px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exceptions.map((ex) => (
                <TableRow key={ex.id}>
                  <TableCell className="font-medium capitalize">
                    {formatDateRange(ex.dateFrom, ex.dateTo)}
                  </TableCell>
                  <TableCell>
                    {ex.isClosed ? (
                      <Badge variant="destructive">Cerrado</Badge>
                    ) : (
                      <Badge variant="secondary">Abierto</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {(ex.isBlockedRange ?? (ex as { is_blocked_range?: boolean }).is_blocked_range) &&
                    ex.startTime &&
                    ex.endTime ? (
                      <span className="text-sm">
                        {ex.startTime.slice(0, 5)} - {ex.endTime.slice(0, 5)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">Todo el día</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {getResourceName(ex.resourceId)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteDialog(ex)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva excepción</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="dateFrom">Desde</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={form.dateFrom}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((f) => ({ ...f, dateFrom: v, dateTo: f.dateTo && v > f.dateTo ? v : f.dateTo }));
                  }}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTo">Hasta</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={form.dateTo}
                  onChange={(e) => setForm((f) => ({ ...f, dateTo: e.target.value }))}
                  min={form.dateFrom || new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resourceId">Aplica a</Label>
              <Select
                value={form.resourceId?.toString() ?? 'all'}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, resourceId: v === 'all' ? null : Number(v) }))
                }
              >
                <SelectTrigger id="resourceId">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las agendas</SelectItem>
                  {resources.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  id="isClosed"
                  type="checkbox"
                  checked={form.isClosed}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isClosed: e.target.checked }))
                  }
                  className="size-4"
                />
                <Label htmlFor="isClosed" className="cursor-pointer">
                  Negocio cerrado
                </Label>
              </div>
              <p className="text-xs text-muted-foreground pl-6">
                {form.isClosed ? 'El negocio no atenderá' : 'El negocio estará abierto'} en las fechas indicadas.
              </p>

              <div className="flex items-center gap-2">
                <input
                  id="isBlockedRange"
                  type="checkbox"
                  checked={form.isBlockedRange}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isBlockedRange: e.target.checked }))
                  }
                  className="size-4"
                />
                <Label htmlFor="isBlockedRange" className="cursor-pointer">
                  Rango de horario específico
                </Label>
              </div>

              {form.isBlockedRange && (
                <div className="grid grid-cols-2 gap-3 pl-6">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Desde</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={form.startTime || ''}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, startTime: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">Hasta</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={form.endTime || ''}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, endTime: e.target.value }))
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? 'Creando...' : 'Crear excepción'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar excepción</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Estás seguro de que querés eliminar esta excepción?
            {deletingException && (
              <span className="block mt-2 font-medium text-foreground capitalize">
                {formatDateRange(deletingException.dateFrom, deletingException.dateTo)}
              </span>
            )}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
