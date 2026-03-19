import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { exceptionsService, type CreateExceptionDto } from '@/services/exceptions.service';
import { resourcesService } from '@/services/resources.service';
import type { Exception, Resource } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Trash2, Plus } from 'lucide-react';

interface BusinessExceptionsManagerProps {
  businessId: number;
  resourceId?: number;
  showResourceFilter?: boolean;
}

export default function BusinessExceptionsManager({
  businessId,
  resourceId,
  showResourceFilter = true,
}: BusinessExceptionsManagerProps) {
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CreateExceptionDto>({
    businessId,
    dateFrom: '',
    dateTo: '',
    isClosed: true,
    isBlockedRange: false,
    startTime: null,
    endTime: null,
    resourceId: resourceId || null,
  });
  const [saving, setSaving] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingException, setDeletingException] = useState<Exception | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([
      loadExceptions(),
      showResourceFilter ? resourcesService.getAll(businessId).then(setResources) : Promise.resolve([]),
    ]).catch(() => {});
  }, [businessId]);

  const loadExceptions = async () => {
    setLoading(true);
    try {
      const data = await exceptionsService.getAll(businessId);
      const filtered = resourceId
        ? data.filter((e) => e.resourceId === resourceId || !e.resourceId)
        : data.filter((e) => !e.resourceId);
      setExceptions(filtered.sort((a, b) => a.dateFrom.localeCompare(b.dateFrom)));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar excepciones');
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setForm({
      businessId,
      dateFrom: '',
      dateTo: '',
      isClosed: true,
      isBlockedRange: false,
      startTime: null,
      endTime: null,
      description: null,
      resourceId: resourceId || null,
    });
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!form.dateFrom || !form.dateTo) {
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
    if (!deletingException) return;
    setDeleting(true);
    try {
      await exceptionsService.delete(businessId, deletingException.id, deletingException.resourceId || undefined);
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

  const getResourceName = (rid: number | null | undefined) => {
    if (!rid) return resourceId ? 'Todas las agendas' : '—';
    return resources.find((r) => r.id === rid)?.name ?? '—';
  };

  const handleDateFromChange = (value: string) => {
    setForm((f) => ({ ...f, dateFrom: value, dateTo: f.dateTo && value > f.dateTo ? value : f.dateTo }));
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {resourceId
              ? 'Excepciones heredadas del negocio y personalizadas de esta agenda.'
              : 'Excepciones que aplican a todas las agendas.'}
          </p>
          <Button onClick={openCreateDialog} size="sm">
            <Plus className="size-3 mr-1" />
            Nueva excepción
          </Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm">Cargando...</p>
        ) : exceptions.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">
            No hay excepciones configuradas.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Horarios</TableHead>
                  <TableHead>Descripción</TableHead>
                  {resourceId && <TableHead>Origen</TableHead>}
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exceptions.map((ex) => {
                  const isInherited = resourceId && !ex.resourceId;
                  return (
                    <TableRow key={ex.id} className={isInherited ? 'bg-muted/30' : ''}>
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
                      <TableCell>
                        {ex.description ? (
                          <span className="text-sm">{ex.description}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">Sin descripción</span>
                        )}
                      </TableCell>
                      {resourceId && (
                        <TableCell>
                          {isInherited ? (
                            <Badge variant="outline">Heredado</Badge>
                          ) : (
                            <Badge variant="default">Personalizado</Badge>
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        {(!resourceId || !isInherited) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(ex)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

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
                  onChange={(e) => handleDateFromChange(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTo">Hasta</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={form.dateTo}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dateTo: e.target.value }))
                  }
                  min={form.dateFrom || new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            {showResourceFilter && !resourceId && (
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
            )}

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

            <div className="space-y-2">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea
                id="description"
                value={form.description || ''}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Ej: Feriado, vacaciones, evento especial..."
                rows={3}
                maxLength={500}
              />
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
    </>
  );
}
