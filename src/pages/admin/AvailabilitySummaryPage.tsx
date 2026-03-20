import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { availabilityService } from '@/services/availability.service';
import { exceptionsService } from '@/services/exceptions.service';
import { resourcesService } from '@/services/resources.service';
import { businessService } from '@/services/business.service';
import { slotsService } from '@/services/slots.service';
import type {
  AvailabilityRule,
  Exception,
  AvailabilityBlock,
  Resource,
  Slot,
} from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowRight,
  CalendarCheck,
  ExternalLink,
  Ban,
  CalendarOff,
  Clock,
  Trash2,
} from 'lucide-react';

const DAY_NAMES: Record<number, string> = {
  1: 'Lun',
  2: 'Mar',
  3: 'Mié',
  4: 'Jue',
  5: 'Vie',
  6: 'Sáb',
  7: 'Dom',
};

const BLOCK_DAY_NAMES: Record<number, string> = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
};

function formatTime(t: string) {
  return t.slice(0, 5);
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
}

function formatDateRange(dateFrom: string, dateTo: string) {
  if (dateFrom === dateTo) return formatDate(dateFrom);
  return `${formatDate(dateFrom)} - ${formatDate(dateTo)}`;
}

export default function AvailabilitySummaryPage() {
  const { businessId } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [businessSlug, setBusinessSlug] = useState<string | null>(null);
  const [businessRules, setBusinessRules] = useState<AvailabilityRule[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [resourceRules, setResourceRules] = useState<Map<number, AvailabilityRule[]>>(new Map());
  const [previewDate, setPreviewDate] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const offset = day === 0 ? 6 : day - 1;
    const monday = new Date(d);
    monday.setDate(d.getDate() - offset);
    return monday.toISOString().split('T')[0];
  });
  const [previewResourceId, setPreviewResourceId] = useState<number | null>(null);
  const [previewSlots, setPreviewSlots] = useState<Slot[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [exceptionsModalOpen, setExceptionsModalOpen] = useState(false);
  const [exceptionsModalData, setExceptionsModalData] = useState<Exception[]>([]);
  const [exceptionsModalTitle, setExceptionsModalTitle] = useState('');
  const [exceptionsModalResourceId, setExceptionsModalResourceId] = useState<number | null>(null);

  const [deleteExceptionDialogOpen, setDeleteExceptionDialogOpen] = useState(false);
  const [deletingException, setDeletingException] = useState<Exception | null>(null);
  const [deletingExceptionInProgress, setDeletingExceptionInProgress] = useState(false);

  const [blocksModalOpen, setBlocksModalOpen] = useState(false);
  const [blocksModalData, setBlocksModalData] = useState<AvailabilityBlock[]>([]);
  const [blocksModalTitle, setBlocksModalTitle] = useState('');

  useEffect(() => {
    if (!businessId) return;
    const load = async () => {
      setLoading(true);
      try {
        const [rules, res, exs, blks, biz] = await Promise.all([
          availabilityService.getBusinessRules(businessId),
          resourcesService.getAll(businessId),
          exceptionsService.getAll(businessId),
          availabilityService.listBusinessBlocks(businessId),
          businessService.getById(businessId).catch(() => null),
        ]);
        setBusinessRules(rules.filter((r) => !r.resourceId));
        setResources(res);
        setExceptions(exs);
        setBlocks(blks);
        setBusinessSlug(biz?.slug ?? null);

        const resourceRulesMap = new Map<number, AvailabilityRule[]>();
        await Promise.all(
          res.map(async (r) => {
            const rr = await availabilityService.getResourceRules(r.id);
            resourceRulesMap.set(r.id, rr);
          }),
        );
        setResourceRules(resourceRulesMap);
        if (res.length > 0 && !previewResourceId) {
          setPreviewResourceId(res[0].id);
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Error al cargar');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [businessId]);

  useEffect(() => {
    if (!previewResourceId || !previewDate) return;
    setLoadingPreview(true);
    slotsService
      .getPublicSlots(previewResourceId, previewDate)
      .then((data) => setPreviewSlots(data))
      .catch(() => setPreviewSlots([]))
      .finally(() => setLoadingPreview(false));
  }, [previewResourceId, previewDate]);

  const businessExceptions = exceptions.filter((e) => !e.resourceId);
  const businessBlocks = blocks.filter((b) => !b.resourceId);
  const businessExceptionsCount = businessExceptions.length;
  const businessBlocksCount = businessBlocks.length;

  const openExceptionsModal = (items: Exception[], title: string, resourceId?: number | null) => {
    setExceptionsModalData(items);
    setExceptionsModalTitle(title);
    setExceptionsModalResourceId(resourceId ?? null);
    setExceptionsModalOpen(true);
  };

  const openBlocksModal = (items: AvailabilityBlock[], title: string) => {
    setBlocksModalData(items);
    setBlocksModalTitle(title);
    setBlocksModalOpen(true);
  };

  const canDeleteException = (ex: Exception) => {
    if (!exceptionsModalResourceId) return true;
    return ex.resourceId === exceptionsModalResourceId;
  };

  const openDeleteExceptionDialog = (ex: Exception) => {
    setDeletingException(ex);
    setDeleteExceptionDialogOpen(true);
  };

  const handleDeleteException = async () => {
    if (!businessId || !deletingException) return;
    setDeletingExceptionInProgress(true);
    try {
      await exceptionsService.delete(
        businessId,
        deletingException.id,
        deletingException.resourceId ?? undefined
      );
      toast.success('Excepción eliminada');
      setDeleteExceptionDialogOpen(false);
      setDeletingException(null);
      setExceptionsModalData((prev) => prev.filter((e) => e.id !== deletingException.id));
      setExceptions((prev) => prev.filter((e) => e.id !== deletingException.id));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setDeletingExceptionInProgress(false);
    }
  };

  const getEffectiveRulesForResource = (resourceId: number) => {
    const custom = resourceRules.get(resourceId) ?? [];
    const byDay = new Map<number, { start: string; end: string; source: 'custom' | 'inherited' }>();
    businessRules.forEach((r) => {
      byDay.set(r.dayOfWeek, {
        start: r.startLocalTime,
        end: r.endLocalTime,
        source: 'inherited',
      });
    });
    custom.forEach((r) => {
      byDay.set(r.dayOfWeek, {
        start: r.startLocalTime,
        end: r.endLocalTime,
        source: 'custom',
      });
    });
    return Array.from(byDay.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([day, v]) => ({ day, ...v }));
  };

  const getResourceExceptions = (resourceId: number) =>
    exceptions.filter((e) => e.resourceId === resourceId || !e.resourceId);

  const getResourceBlocks = (resourceId: number) =>
    blocks.filter((b) => b.resourceId === resourceId || !b.resourceId);

  const getResourceName = (resourceId: number | null | undefined) => {
    if (!resourceId) return 'Todas las agendas';
    return resources.find((r) => r.id === resourceId)?.name ?? '—';
  };

  const availableSlotsCount = previewSlots.filter((s) => !s.isBooked).length;

  if (!businessId) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Resumen de disponibilidad</h2>
        <p className="text-sm text-muted-foreground">
          Vista consolidada de cómo quedaron configuradas las agendas y sus turnos.
        </p>
      </div>

      {loading ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-64" />
              <Skeleton className="h-4 w-full mt-2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-lg border p-3 space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <div className="flex flex-wrap gap-1">
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
              <Skeleton className="h-9 w-48" />
            </CardContent>
          </Card>
          <div className="space-y-4">
            <Skeleton className="h-6 w-28" />
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48 mt-2" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-1">
                      <Skeleton className="h-5 w-14 rounded-full" />
                      <Skeleton className="h-5 w-14 rounded-full" />
                      <Skeleton className="h-5 w-14 rounded-full" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-6 w-24" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Herencia: Mi Negocio */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowRight className="size-4" />
                Base del negocio (hereda a todas las agendas)
              </CardTitle>
              <CardDescription>
                Horarios, excepciones y bloqueos definidos en Mi Negocio se aplican por defecto.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                    <Clock className="size-4" />
                    Horarios
                  </div>
                  {businessRules.length === 0 ? (
                    <p className="text-sm text-destructive">Sin definir</p>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {businessRules
                        .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                        .map((r) => (
                          <Badge key={r.id} variant="secondary" className="text-xs">
                            {DAY_NAMES[r.dayOfWeek]} {formatTime(r.startLocalTime)}-{formatTime(r.endLocalTime)}
                          </Badge>
                        ))}
                    </div>
                  )}
                </div>
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                    <CalendarOff className="size-4" />
                    Excepciones
                  </div>
                  <button
                    type="button"
                    onClick={() => openExceptionsModal(businessExceptions, 'Excepciones del negocio')}
                    className="text-sm text-primary hover:underline font-medium"
                  >
                    {businessExceptionsCount} {businessExceptionsCount === 1 ? 'excepción' : 'excepciones'}
                  </button>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                    <Ban className="size-4" />
                    Bloqueos
                  </div>
                  <button
                    type="button"
                    onClick={() => openBlocksModal(businessBlocks, 'Bloqueos del negocio')}
                    className="text-sm text-primary hover:underline font-medium"
                  >
                    {businessBlocksCount} {businessBlocksCount === 1 ? 'bloqueo' : 'bloqueos'}
                  </button>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/admin/business')}>
                Configurar en Mi Negocio
              </Button>
            </CardContent>
          </Card>

          {/* Por agenda */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Por agenda</h3>
            {resources.length === 0 ? (
              <p className="text-muted-foreground text-sm">No hay agendas creadas.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {resources.map((r) => {
                  const effective = getEffectiveRulesForResource(r.id);
                  const resourceExs = getResourceExceptions(r.id);
                  const resourceBlks = getResourceBlocks(r.id);
                  return (
                    <Card key={r.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{r.name}</CardTitle>
                        <CardDescription>
                          {r.slotMinutes} min por turno · buffer {r.bufferMinutes} min
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex flex-wrap gap-1">
                          {effective.map(({ day, start, end, source }) => (
                            <Badge
                              key={day}
                              variant={'secondary'}
                              className="text-xs"
                            >
                              {DAY_NAMES[day]} {formatTime(start)}-{formatTime(end)}
                              {source === 'custom' && ' (personalizado)'}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex gap-4 text-xs">
                          <button
                            type="button"
                            onClick={() => openExceptionsModal(resourceExs, `Excepciones · ${r.name}`, r.id)}
                            className="text-primary hover:underline font-medium"
                          >
                            {resourceExs.length} excepciones
                          </button>
                          <button
                            type="button"
                            onClick={() => openBlocksModal(resourceBlks, `Bloqueos · ${r.name}`)}
                            className="text-primary hover:underline font-medium"
                          >
                            {resourceBlks.length} bloqueos
                          </button>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate('/admin/resources')}
                        >
                          Editar disponibilidad
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Vista previa de turnos */}
          {resources.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarCheck className="size-4" />
                  Vista previa de turnos
                </CardTitle>
                <CardDescription>
                  Cómo se ven los turnos disponibles para una fecha.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Fecha</label>
                    <input
                      type="date"
                      value={previewDate}
                      onChange={(e) => setPreviewDate(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Agenda</label>
                    <Select
                      value={previewResourceId?.toString() ?? ''}
                      onValueChange={(v) => setPreviewResourceId(Number(v))}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {resources.map((r) => (
                          <SelectItem key={r.id} value={String(r.id)}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {loadingPreview ? (
                  <div className="grid grid-cols-4 gap-1">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <Skeleton key={i} className="h-9 rounded-lg" />
                    ))}
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium mb-2">
                      {availableSlotsCount} turnos disponibles de {previewSlots.length} total
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {previewSlots
                        .filter((s) => !s.isBooked)
                        .slice(0, 12)
                        .map((s) => (
                          <Badge key={`${s.startsAtUtc}-${s.endsAtUtc}`} variant="outline">
                            {new Date(s.startsAtUtc).toLocaleTimeString('es-AR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Badge>
                        ))}
                      {availableSlotsCount > 12 && (
                        <span className="text-sm text-muted-foreground">
                          +{availableSlotsCount - 12} más
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {businessSlug && (
                  <Button asChild variant="outline" size="sm">
                    <a href={`/${businessSlug}`} target="_blank" rel="noreferrer noopener">
                      <ExternalLink className="size-4 mr-2" />
                      Ver como cliente
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Modal Excepciones */}
      <Dialog open={exceptionsModalOpen} onOpenChange={setExceptionsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{exceptionsModalTitle}</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto flex-1 -mx-6 px-6">
            {exceptionsModalData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No hay excepciones.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Horarios</TableHead>
                    <TableHead>Aplica a</TableHead>
                    <TableHead className="w-[80px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exceptionsModalData.map((ex) => (
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
                        {canDeleteException(ex) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteExceptionDialog(ex)}
                            title="Eliminar"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteExceptionDialogOpen} onOpenChange={setDeleteExceptionDialogOpen}>
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
            <Button variant="outline" onClick={() => setDeleteExceptionDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteException}
              disabled={deletingExceptionInProgress}
            >
              {deletingExceptionInProgress ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Bloqueos */}
      <Dialog open={blocksModalOpen} onOpenChange={setBlocksModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{blocksModalTitle}</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto flex-1 -mx-6 px-6">
            {blocksModalData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No hay bloqueos.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Día</TableHead>
                    <TableHead>Desde</TableHead>
                    <TableHead>Hasta</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Aplica a</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blocksModalData.map((block) => (
                    <TableRow key={block.id}>
                      <TableCell className="font-medium">
                        {BLOCK_DAY_NAMES[block.dayOfWeek] ?? `Día ${block.dayOfWeek}`}
                      </TableCell>
                      <TableCell>{formatTime(block.startLocalTime)}</TableCell>
                      <TableCell>{formatTime(block.endLocalTime)}</TableCell>
                      <TableCell>
                        {block.description ? (
                          <span className="text-sm">{block.description}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {getResourceName(block.resourceId)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
