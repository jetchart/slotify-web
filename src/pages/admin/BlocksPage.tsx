import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Ban } from 'lucide-react';

export default function BlocksPage() {
  const { businessId } = useAuth();
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CreateAvailabilityBlockDto>({
    startsAtUtc: '',
    endsAtUtc: '',
    reason: '',
    resourceId: undefined,
  });
  const [saving, setSaving] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingBlock, setDeletingBlock] = useState<AvailabilityBlock | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!businessId) return;

    Promise.all([
      loadBlocks(),
      resourcesService.getAll(businessId).then(setResources),
    ]).catch(() => {});
  }, [businessId]);

  const loadBlocks = async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const data = await availabilityService.listBusinessBlocks(businessId);
      setBlocks(data.sort((a, b) => a.startsAtUtc.localeCompare(b.startsAtUtc)));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar bloqueos');
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const startsAt = new Date(tomorrow);
    startsAt.setHours(9, 0, 0, 0);
    const endsAt = new Date(tomorrow);
    endsAt.setHours(18, 0, 0, 0);

    setForm({
      startsAtUtc: startsAt.toISOString().slice(0, 16),
      endsAtUtc: endsAt.toISOString().slice(0, 16),
      reason: '',
      resourceId: undefined,
    });
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!businessId || !form.startsAtUtc || !form.endsAtUtc) {
      toast.error('Completá fecha y hora de inicio y fin');
      return;
    }

    setSaving(true);
    try {
      await availabilityService.createBusinessBlock(businessId, {
        ...form,
        startsAtUtc: new Date(form.startsAtUtc).toISOString(),
        endsAtUtc: new Date(form.endsAtUtc).toISOString(),
      });
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
    if (!businessId || !deletingBlock) return;
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

  const formatDateTime = (utc: string) =>
    new Date(utc).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const getResourceName = (resourceId: number | null | undefined) => {
    if (!resourceId) return 'Todas las agendas';
    return resources.find((r) => r.id === resourceId)?.name ?? '—';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Bloqueos</h2>
          <p className="text-sm text-muted-foreground">
            Bloqueá rangos de tiempo específicos para el negocio o recursos individuales.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="size-4 mr-2" />
          Nuevo bloqueo
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Cargando...</p>
      ) : blocks.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <Ban className="size-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm">
            No hay bloqueos configurados. Agregá bloqueos para fechas/horarios específicos.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Desde</TableHead>
                <TableHead>Hasta</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Aplica a</TableHead>
                <TableHead className="w-[100px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {blocks.map((block) => (
                <TableRow key={block.id}>
                  <TableCell className="font-medium">
                    {formatDateTime(block.startsAtUtc)}
                  </TableCell>
                  <TableCell>
                    {formatDateTime(block.endsAtUtc)}
                  </TableCell>
                  <TableCell>
                    {block.reason ? (
                      <span className="text-sm">{block.reason}</span>
                    ) : (
                      <span className="text-muted-foreground text-sm">Sin motivo</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {getResourceName(block.resourceId)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteDialog(block)}
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
            <DialogTitle>Nuevo bloqueo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="resourceId">Aplica a</Label>
              <Select
                value={form.resourceId?.toString() ?? 'all'}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, resourceId: v === 'all' ? undefined : Number(v) }))
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

            <div className="space-y-2">
              <Label htmlFor="startsAtUtc">Desde (fecha y hora)</Label>
              <Input
                id="startsAtUtc"
                type="datetime-local"
                value={form.startsAtUtc}
                onChange={(e) => setForm((f) => ({ ...f, startsAtUtc: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endsAtUtc">Hasta (fecha y hora)</Label>
              <Input
                id="endsAtUtc"
                type="datetime-local"
                value={form.endsAtUtc}
                onChange={(e) => setForm((f) => ({ ...f, endsAtUtc: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Motivo (opcional)</Label>
              <Textarea
                id="reason"
                value={form.reason || ''}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="Ej: Evento privado, mantenimiento, etc."
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
            ¿Estás seguro de que querés eliminar este bloqueo?
            {deletingBlock && (
              <span className="block mt-2 font-medium text-foreground">
                {formatDateTime(deletingBlock.startsAtUtc)} - {formatDateTime(deletingBlock.endsAtUtc)}
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
