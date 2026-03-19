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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

function formatTime(t: string) {
  return t.slice(0, 5);
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

  const businessExceptionsCount = exceptions.filter((e) => !e.resourceId).length;
  const businessBlocksCount = blocks.filter((b) => !b.resourceId).length;

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

  const getResourceExceptionsCount = (resourceId: number) =>
    exceptions.filter((e) => e.resourceId === resourceId || !e.resourceId).length;

  const getResourceBlocksCount = (resourceId: number) =>
    blocks.filter((b) => b.resourceId === resourceId || !b.resourceId).length;

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
        <p className="text-muted-foreground text-sm">Cargando...</p>
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
                  <p className="text-sm">
                    {businessExceptionsCount} {businessExceptionsCount === 1 ? 'excepción' : 'excepciones'}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                    <Ban className="size-4" />
                    Bloqueos
                  </div>
                  <p className="text-sm">
                    {businessBlocksCount} {businessBlocksCount === 1 ? 'bloqueo' : 'bloqueos'}
                  </p>
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
                  const exCount = getResourceExceptionsCount(r.id);
                  const blkCount = getResourceBlocksCount(r.id);
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
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>{exCount} excepciones</span>
                          <span>{blkCount} bloqueos</span>
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
                  <p className="text-sm text-muted-foreground">Cargando turnos...</p>
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
    </div>
  );
}
