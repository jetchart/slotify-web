import { Fragment, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { resourcesService } from '@/services/resources.service';
import { availabilityService } from '@/services/availability.service';
import type { Resource, CreateResourceDto, UpdateResourceDto } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Pencil, CalendarClock } from 'lucide-react';
import ResourceAvailabilityEditor from '@/pages/admin/ResourceAvailabilityEditor';

export default function ResourcesPage() {
  const { businessId } = useAuth();
  const navigate = useNavigate();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBusinessAvailability, setLoadingBusinessAvailability] = useState(false);
  const [hasBusinessAvailability, setHasBusinessAvailability] = useState<boolean>(true);
  const [expandedResourceId, setExpandedResourceId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Resource | null>(null);
  const [form, setForm] = useState({ name: '', slotMinutes: 60, bufferMinutes: 0 });
  const [saving, setSaving] = useState(false);

  const fetchResources = async () => {
    if (!businessId) return;
    try {
      const data = await resourcesService.getAll(businessId);
      setResources(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar agendas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchResources(); }, [businessId]);

  useEffect(() => {
    const loadBusinessAvailability = async () => {
      if (!businessId) return;
      setLoadingBusinessAvailability(true);
      try {
        const rules = await availabilityService.getBusinessRules(businessId);
        setHasBusinessAvailability(rules.length > 0);
      } catch {
        // Si falla el check, no bloqueamos la UI.
        setHasBusinessAvailability(true);
      } finally {
        setLoadingBusinessAvailability(false);
      }
    };

    loadBusinessAvailability();
  }, [businessId]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', slotMinutes: 60, bufferMinutes: 0 });
    setDialogOpen(true);
  };

  const openEdit = (r: Resource) => {
    setEditing(r);
    setForm({ name: r.name, slotMinutes: r.slotMinutes, bufferMinutes: r.bufferMinutes });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const dto: UpdateResourceDto = {
          name: form.name,
          slotMinutes: form.slotMinutes,
          bufferMinutes: form.bufferMinutes,
        };
        await resourcesService.update(editing.id, dto);
        toast.success('Agenda actualizada');
      } else {
        if (!businessId) return;
        const dto: CreateResourceDto = {
          businessId,
          name: form.name,
          slotMinutes: form.slotMinutes,
          bufferMinutes: form.bufferMinutes,
        };
        const created = await resourcesService.create(dto);
        toast.success('Agenda creada');
        setDialogOpen(false);
        setExpandedResourceId(created.id);
        fetchResources();
        return;
      }
      setDialogOpen(false);
      fetchResources();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Agendas</h2>
          <p className="text-sm text-muted-foreground">Gestioná las canchas, salas u otras agendas disponibles para reservar.</p>
        </div>
        <Button onClick={openCreate} className="self-start sm:self-auto">
          <Plus className="size-4" />
          Nueva agenda
        </Button>
      </div>

      {!loadingBusinessAvailability && !hasBusinessAvailability && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4">
          <p className="text-sm font-medium text-destructive">
            Primero tenes que definir los dias y horarios en Mi Negocio
          </p>
          <p className="text-xs text-destructive/80 mt-1">
            Mientras tanto, no vas a poder editar la disponibilidad desde las agendas.
          </p>
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground text-sm">Cargando...</p>
      ) : resources.length === 0 ? (
        <p className="text-muted-foreground text-sm">No hay agendas creadas todavía.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Duración slot</TableHead>
                <TableHead>Buffer</TableHead>
                <TableHead className="w-[140px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resources.map((r) => {
                const isExpanded = expandedResourceId === r.id;
                return (
                  <Fragment key={r.id}>
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.slotMinutes} min</TableCell>
                      <TableCell>{r.bufferMinutes} min</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(r)} title="Editar">
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setExpandedResourceId((prev) => (prev === r.id ? null : r.id))}
                            title={isExpanded ? 'Ocultar disponibilidad' : 'Mostrar disponibilidad'}
                            disabled={!hasBusinessAvailability}
                          >
                            <CalendarClock className={`size-4 ${isExpanded ? 'rotate-180' : ''}`} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={4} className="p-4">
                          <ResourceAvailabilityEditor resourceId={r.id} businessId={businessId} />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar agenda' : 'Nueva agenda'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ej: Cancha 1"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="slotMinutes">Duración del turno (min)</Label>
                <Input
                  id="slotMinutes"
                  type="number"
                  min={1}
                  value={form.slotMinutes}
                  onChange={(e) => setForm((f) => ({ ...f, slotMinutes: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bufferMinutes">Buffer entre turnos (min)</Label>
                <Input
                  id="bufferMinutes"
                  type="number"
                  min={0}
                  value={form.bufferMinutes}
                  onChange={(e) => setForm((f) => ({ ...f, bufferMinutes: Number(e.target.value) }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
