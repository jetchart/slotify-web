import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { availabilityService } from '@/services/availability.service';
import { resourcesService } from '@/services/resources.service';
import type { AvailabilityBlock, Resource, CreateAvailabilityBlockDto } from '@/types';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus } from 'lucide-react';

interface BusinessBlocksManagerProps {
  businessId: number;
  resourceId?: number;
  showResourceFilter?: boolean;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
];

export default function BusinessBlocksManager({
  businessId,
  resourceId,
  showResourceFilter = true,
}: BusinessBlocksManagerProps) {
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CreateAvailabilityBlockDto>({
    dayOfWeek: 1,
    startLocalTime: '09:00',
    endLocalTime: '10:00',
    description: '',
    resourceId: resourceId ?? null,
  });
  const [saving, setSaving] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingBlock, setDeletingBlock] = useState<AvailabilityBlock | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([
      loadBlocks(),
      showResourceFilter ? resourcesService.getAll(businessId).then(setResources) : Promise.resolve([]),
    ]).catch(() => {});
  }, [businessId]);

  const loadBlocks = async () => {
    setLoading(true);
    try {
      const data = await availabilityService.listBusinessBlocks(businessId);
      const filtered = resourceId
        ? data.filter((b) => b.resourceId === resourceId || !b.resourceId)
        : data.filter((b) => !b.resourceId);
      setBlocks(filtered.sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startLocalTime.localeCompare(b.startLocalTime)));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar bloqueos');
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setForm({
      dayOfWeek: 1,
      startLocalTime: '09:00',
      endLocalTime: '10:00',
      description: '',
      resourceId: resourceId ?? null,
    });
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!form.startLocalTime || !form.endLocalTime) {
      toast.error('Completá horario de inicio y fin');
      return;
    }

    setSaving(true);
    try {
      if (resourceId) {
        await availabilityService.createResourceBlock(resourceId, form);
      } else {
        await availabilityService.createBusinessBlock(businessId, form);
      }
      toast.success('Bloqueo creado');
      setDialogOpen(false);
      loadBlocks();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al crear');
    } finally {
      setSaving(false);
    }
  };

  const openDeleteDialog = (block: AvailabilityBlock) => {
    setDeletingBlock(block);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingBlock) return;
    setDeleting(true);
    try {
      if (deletingBlock.resourceId) {
        await availabilityService.deleteResourceBlock(deletingBlock.resourceId, deletingBlock.id);
      } else {
        await availabilityService.deleteBusinessBlock(businessId, deletingBlock.id);
      }
      toast.success('Bloqueo eliminado');
      setDeleteDialogOpen(false);
      loadBlocks();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setDeleting(false);
    }
  };

  const getDayLabel = (dayOfWeek: number) => {
    return DAYS_OF_WEEK.find((d) => d.value === dayOfWeek)?.label ?? '—';
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {resourceId
              ? 'Bloqueos recurrentes heredados del negocio y personalizados de esta agenda.'
              : 'Bloqueos recurrentes que aplican a todas las agendas.'}
          </p>
          <Button onClick={openCreateDialog} size="sm">
            <Plus className="size-3 mr-1" />
            Nuevo bloqueo
          </Button>
        </div>

        {loading ? (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Día</TableHead>
                  <TableHead>Desde</TableHead>
                  <TableHead>Hasta</TableHead>
                  <TableHead>Descripción</TableHead>
                  {resourceId && <TableHead>Origen</TableHead>}
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-14" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-14" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    {resourceId && <TableCell><Skeleton className="h-4 w-16" /></TableCell>}
                    <TableCell><Skeleton className="size-8" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : blocks.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">
            No hay bloqueos configurados.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Día</TableHead>
                  <TableHead>Desde</TableHead>
                  <TableHead>Hasta</TableHead>
                  <TableHead>Descripción</TableHead>
                  {resourceId && <TableHead>Origen</TableHead>}
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blocks.map((block) => {
                  const isInherited = resourceId && !block.resourceId;
                  return (
                    <TableRow key={block.id} className={isInherited ? 'bg-muted/30' : ''}>
                      <TableCell className="font-medium">
                        {getDayLabel(block.dayOfWeek)}
                      </TableCell>
                      <TableCell>
                        {block.startLocalTime}
                      </TableCell>
                      <TableCell>
                        {block.endLocalTime}
                      </TableCell>
                      <TableCell>
                        {block.description ? (
                          <span className="text-sm">{block.description}</span>
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
                            onClick={() => openDeleteDialog(block)}
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
            <DialogTitle>Nuevo bloqueo recurrente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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

            <div className="space-y-2">
              <Label htmlFor="dayOfWeek">Día de la semana</Label>
              <Select
                value={form.dayOfWeek.toString()}
                onValueChange={(v) => setForm((f) => ({ ...f, dayOfWeek: Number(v) }))}
              >
                <SelectTrigger id="dayOfWeek">
                  <SelectValue placeholder="Seleccionar día" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day) => (
                    <SelectItem key={day.value} value={day.value.toString()}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startLocalTime">Hora de inicio</Label>
              <Input
                id="startLocalTime"
                type="time"
                value={form.startLocalTime}
                onChange={(e) => setForm((f) => ({ ...f, startLocalTime: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endLocalTime">Hora de fin</Label>
              <Input
                id="endLocalTime"
                type="time"
                value={form.endLocalTime}
                onChange={(e) => setForm((f) => ({ ...f, endLocalTime: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea
                id="description"
                value={form.description || ''}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Ej: Reunión semanal, descanso, etc."
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
              {saving ? 'Creando...' : 'Crear bloqueo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar bloqueo</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Estás seguro de que querés eliminar este bloqueo recurrente?
            {deletingBlock && (
              <span className="block mt-2 font-medium text-foreground">
                {getDayLabel(deletingBlock.dayOfWeek)} de {deletingBlock.startLocalTime} a {deletingBlock.endLocalTime}
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
