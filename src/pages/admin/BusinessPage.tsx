import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { availabilityService } from '@/services/availability.service';
import { businessService } from '@/services/business.service';
import { resourcesService } from '@/services/resources.service';
import type { Business, UpsertAvailabilityRuleDto } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarIcon, Plus, Save, Trash2, Info, Pencil, X, Check } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import BusinessCreateForm from '@/components/BusinessCreateForm';
import { Skeleton } from '@/components/ui/skeleton';
import BusinessExceptionsManager from '@/components/BusinessExceptionsManager';
import BusinessBlocksManager from '@/components/BusinessBlocksManager';
import { useAvailability } from '@/context/AvailabilityContext';

const DAY_NAMES: Record<number, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  7: 'Domingo',
};

interface RuleForm {
  dayOfWeek: number;
  startLocalTime: string;
  endLocalTime: string;
}

const VALID_TABS = ['horarios', 'excepciones', 'bloqueos'] as const;

export default function BusinessPage() {
  const { businessId } = useAuth();
  const { refresh: refreshAvailability } = useAvailability();
  const [searchParams, setSearchParams] = useSearchParams();

  if (!businessId) {
    return <BusinessCreateForm />;
  }
  const tabFromUrl = searchParams.get('tab');
  const activeTab = VALID_TABS.includes(tabFromUrl as (typeof VALID_TABS)[number])
    ? (tabFromUrl as (typeof VALID_TABS)[number])
    : 'horarios';
  const [loadingRules, setLoadingRules] = useState(true);
  const [loadingBusiness, setLoadingBusiness] = useState(true);
  const [loadingAgendas, setLoadingAgendas] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rules, setRules] = useState<RuleForm[]>([]);
  const [business, setBusiness] = useState<Pick<Business, 'name' | 'description' | 'slug' | 'maxBookingWindowDays' | 'isBookingBlocked'> | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    slug: '',
    maxBookingWindowDays: 30,
    isBookingBlocked: false,
  });
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [showScheduleEditor, setShowScheduleEditor] = useState(false);
  const [agendasCount, setAgendasCount] = useState(0);

  const defaultWeekdayRules: RuleForm[] = useMemo(
    () => [1, 2, 3, 4, 5].map((day) => ({ dayOfWeek: day, startLocalTime: '09:00', endLocalTime: '18:00' })),
    [],
  );

  useEffect(() => {
    const load = async () => {
      if (!businessId) {
        setLoadingRules(false);
        setLoadingBusiness(false);
        setLoadingAgendas(false);
        return;
      }
      // Cargamos primero las reglas y en paralelo los datos del negocio,
      // pero no dejamos que un 404 del business corte la experiencia.
      const rulesPromise = (async () => {
        try {
          const data = await availabilityService.getBusinessRules(businessId);
          const businessRules = data.filter((r) => !r.resourceId);
          if (businessRules.length > 0) {
            setRules(
              businessRules.map((r) => ({
                dayOfWeek: r.dayOfWeek,
                startLocalTime: r.startLocalTime,
                endLocalTime: r.endLocalTime,
              })),
            );
            setShowScheduleEditor(true);
          } else {
            setRules([]);
            setShowScheduleEditor(false);
          }
        } catch (err: unknown) {
          toast.error(err instanceof Error ? err.message : 'Error al cargar reglas');
        } finally {
          setLoadingRules(false);
        }
      })();

      const businessPromise = (async () => {
        try {
          const biz = await businessService.getById(businessId);
          setBusiness({
            name: biz.name,
            description: biz.description,
            slug: biz.slug,
            maxBookingWindowDays: biz.maxBookingWindowDays,
            isBookingBlocked: biz.isBookingBlocked,
          });
        } catch {
          // Si el endpoint del negocio no existe en el backend,
          // igual mostramos días y horarios con placeholders.
          setBusiness(null);
        } finally {
          setLoadingBusiness(false);
        }
      })();

      const agendasPromise = (async () => {
        try {
          const resources = await resourcesService.getAll(businessId);
          setAgendasCount(resources.length);
        } catch {
          // Si el backend falla, no bloqueamos la pantalla del panel.
          setAgendasCount(0);
        } finally {
          setLoadingAgendas(false);
        }
      })();

      await Promise.all([rulesPromise, businessPromise, agendasPromise]);
    };
    load();
  }, [businessId, defaultWeekdayRules]);

  const addRuleForDay = (dayOfWeek: number) => {
    const existing = rules.find((r) => r.dayOfWeek === dayOfWeek);
    if (existing) {
      toast.warning('Ya existe una regla para este día');
      return;
    }
    setRules((prev) => [...prev, { dayOfWeek, startLocalTime: '09:00', endLocalTime: '18:00' }]);
  };

  const removeRule = (dayOfWeek: number) => {
    setRules((prev) => prev.filter((r) => r.dayOfWeek !== dayOfWeek));
  };

  const updateRule = (dayOfWeek: number, field: keyof RuleForm, value: string | number) => {
    setRules((prev) => prev.map((r) => (r.dayOfWeek === dayOfWeek ? { ...r, [field]: value } : r)));
  };

  const groupedRules = useMemo(() => {
    const map = new Map<number, RuleForm>();
    rules.forEach((rule) => {
      if (!map.has(rule.dayOfWeek)) {
        map.set(rule.dayOfWeek, rule);
      }
    });
    return Array.from(map.entries())
      .map(([dayOfWeek, rule]) => ({ dayOfWeek, rule }))
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  }, [rules]);

  const handleSave = async () => {
    if (!businessId) return;
    if (!showScheduleEditor || rules.length === 0) return;
    setSaving(true);
    try {
      const payload: UpsertAvailabilityRuleDto[] = rules.map((r) => ({
        businessId,
        resourceId: null,
        dayOfWeek: r.dayOfWeek,
        startLocalTime: r.startLocalTime,
        endLocalTime: r.endLocalTime,
      }));
      await availabilityService.upsertBusinessRules(businessId, payload);
      await refreshAvailability();
      toast.success('Reglas del business guardadas');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDefineDefaultSchedule = () => {
    setRules(defaultWeekdayRules);
    setShowScheduleEditor(true);
  };

  const openEditDialog = () => {
    if (!business) return;
    setEditForm({
      name: business.name,
      description: business.description ?? '',
      slug: business.slug,
      maxBookingWindowDays: business.maxBookingWindowDays ?? 30,
      isBookingBlocked: business.isBookingBlocked ?? false,
    });
    setEditDialogOpen(true);
  };

  const handleSaveBusiness = async () => {
    if (!businessId || !editForm.name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    if (!editForm.slug.trim()) {
      toast.error('El slug es obligatorio');
      return;
    }
    const days = Number(editForm.maxBookingWindowDays);
    if (!Number.isInteger(days) || days < 1) {
      toast.error('Los días máximos de reserva deben ser un número entero mayor a 0');
      return;
    }
    setSavingBusiness(true);
    try {
      const updated = await businessService.update(businessId, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
        slug: editForm.slug.trim(),
        maxBookingWindowDays: days,
        isBookingBlocked: editForm.isBookingBlocked,
      });
      setBusiness({
        name: updated.name,
        description: updated.description,
        slug: updated.slug,
        maxBookingWindowDays: updated.maxBookingWindowDays,
        isBookingBlocked: updated.isBookingBlocked,
      });
      setEditDialogOpen(false);
      toast.success('Negocio actualizado');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSavingBusiness(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          {loadingBusiness ? <Skeleton className="h-8 w-48" /> : (business?.name ?? '—')}
        </h2>
      </div>

      {loadingBusiness ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-9 w-20" />
          </CardHeader>
          <CardContent>
            <dl className="grid gap-2 text-sm">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex justify-between gap-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      ) : business && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Datos del negocio</CardTitle>
            <Button variant="outline" size="sm" onClick={openEditDialog}>
              <Pencil className="size-4" />
              Editar
            </Button>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Nombre</dt>
                <dd className="font-medium">{business.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Descripción</dt>
                <dd className="font-medium">{business.description?.trim() || '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Slug</dt>
                <dd className="font-medium font-mono text-xs">{business.slug || '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Días máx. reserva</dt>
                <dd className="font-medium">{business.maxBookingWindowDays ?? 30}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Permitir reservas?</dt>
                <dd className="font-medium flex items-center gap-1.5">
                  {!business.isBookingBlocked ? (
                    <>
                      <Check className="size-4 text-green-600 dark:text-green-400" />
                      Sí
                    </>
                  ) : (
                    <>
                      <X className="size-4 text-destructive" />
                      No
                    </>
                  )}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}

      {!businessId ? null : loadingBusiness ? (
        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4 flex gap-3">
            <Skeleton className="size-5 shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-28" />
              <Skeleton className="h-9 w-24" />
            </div>
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-9 w-16" />
              </CardHeader>
              <CardContent className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-3 pb-2 border-b last:border-0 last:pb-0">
                    <Skeleton className="h-4 w-24" />
                    <div className="flex gap-2">
                      <Skeleton className="h-9 w-32" />
                      <Skeleton className="h-9 w-32" />
                      <Skeleton className="size-9" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-lg border bg-muted/30 p-4 flex gap-3">
            <Info className="size-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Configuración base del negocio</p>
              <p>
                Los horarios, excepciones y bloqueos que definas aquí se aplican por defecto a{' '}
                <strong>todas las agendas</strong>. Cada agenda puede personalizar su disponibilidad
                desde la sección Agendas.
              </p>
            </div>
          </div>
          <Tabs
          value={activeTab}
          onValueChange={(v) => setSearchParams({ tab: v })}
          className="space-y-4"
        >
          <TabsList>
            <TabsTrigger value="horarios">Horarios</TabsTrigger>
            <TabsTrigger value="excepciones">Excepciones</TabsTrigger>
            <TabsTrigger value="bloqueos">Bloqueos</TabsTrigger>
          </TabsList>

          <TabsContent value="horarios">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base">Días y horarios</CardTitle>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={loadingRules || saving || !showScheduleEditor || rules.length === 0}
                >
                  <Save className="size-4" />
                  {saving ? 'Guardando...' : 'Guardar'}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingRules ? (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="space-y-3 pb-2 border-b last:border-0 last:pb-0">
                        <Skeleton className="h-4 w-24" />
                        <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                          <div className="space-y-1 flex-1 sm:w-32">
                            <Skeleton className="h-4 w-12" />
                            <Skeleton className="h-9 w-full" />
                          </div>
                          <div className="space-y-1 flex-1 sm:w-32">
                            <Skeleton className="h-4 w-12" />
                            <Skeleton className="h-9 w-full" />
                          </div>
                          <Skeleton className="size-9 shrink-0" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {!showScheduleEditor ? (
                      <div className="rounded-md border bg-destructive/10 p-4 space-y-3">
                        <p className="text-sm font-medium text-destructive">
                          Primero tenes que definir los dias y horarios en Mi Negocio
                        </p>
                        <Button type="button" variant="outline" onClick={handleDefineDefaultSchedule} disabled={saving}>
                          Definir horarios/dias
                        </Button>
                      </div>
                    ) : groupedRules.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No hay reglas. Agregá al menos una.</p>
                      ) : (
                        groupedRules.map(({ dayOfWeek, rule }) => (
                          <div
                            key={dayOfWeek}
                            className="space-y-3 pb-2 border-b last:border-0 last:pb-0"
                          >
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                              <Label className="text-base font-medium">
                                {DAY_NAMES[dayOfWeek] ?? `Día ${dayOfWeek}`}
                              </Label>
                            </div>

                            <div className="space-y-2">
                              <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                                <div className="space-y-1 flex-1 sm:w-32">
                                  <Label>Desde</Label>
                                  <Input
                                    type="time"
                                    value={rule.startLocalTime}
                                    onChange={(e) => updateRule(dayOfWeek, 'startLocalTime', e.target.value)}
                                  />
                                </div>
                                <div className="space-y-1 flex-1 sm:w-32">
                                  <Label>Hasta</Label>
                                  <Input
                                    type="time"
                                    value={rule.endLocalTime}
                                    onChange={(e) => updateRule(dayOfWeek, 'endLocalTime', e.target.value)}
                                  />
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeRule(dayOfWeek)}
                                  className="shrink-0"
                                >
                                  <Trash2 className="size-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}

                    {showScheduleEditor && (
                      <div className="pt-4">
                        <Label className="text-sm text-muted-foreground mb-2 block">
                          Agregar reglas para otros días:
                        </Label>
                        <div className="flex flex-wrap gap-2">
                          {[1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => {
                            const hasRule = rules.some((r) => r.dayOfWeek === dayOfWeek);
                            if (hasRule) return null;
                            return (
                              <Button
                                key={dayOfWeek}
                                variant="outline"
                                size="sm"
                                onClick={() => addRuleForDay(dayOfWeek)}
                                disabled={saving}
                              >
                                <Plus className="size-3 mr-1" />
                                {DAY_NAMES[dayOfWeek]}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="excepciones">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Excepciones (Feriados y horarios especiales)</CardTitle>
              </CardHeader>
              <CardContent>
                {businessId && <BusinessExceptionsManager businessId={businessId} />}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bloqueos">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bloqueos de tiempo</CardTitle>
              </CardHeader>
              <CardContent>
                {businessId && <BusinessBlocksManager businessId={businessId} />}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </>
      )}

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar negocio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nombre del negocio"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Descripción</Label>
              <Input
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Descripción opcional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-slug">Slug</Label>
              <Input
                id="edit-slug"
                value={editForm.slug}
                onChange={(e) => setEditForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="identificador-url"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">Usado en la URL pública de reservas</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-maxBookingWindowDays">Días máximos de reserva</Label>
              <Input
                id="edit-maxBookingWindowDays"
                type="number"
                min={1}
                value={editForm.maxBookingWindowDays}
                onChange={(e) => setEditForm((f) => ({ ...f, maxBookingWindowDays: Number(e.target.value) || 30 }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-isBookingBlocked"
                checked={!editForm.isBookingBlocked}
                onChange={(e) => setEditForm((f) => ({ ...f, isBookingBlocked: e.target.checked }))}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="edit-isBookingBlocked" className="cursor-pointer">
                Permitir reservas?
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveBusiness} disabled={savingBusiness}>
              {savingBusiness ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

