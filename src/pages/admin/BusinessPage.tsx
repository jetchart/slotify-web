import { useEffect, useMemo, useState } from 'react';
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
import { CalendarIcon, Plus, Save, Trash2 } from 'lucide-react';
import BusinessExceptionsManager from '@/components/BusinessExceptionsManager';
import BusinessBlocksManager from '@/components/BusinessBlocksManager';

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

export default function BusinessPage() {
  const { businessId } = useAuth();
  const [loadingRules, setLoadingRules] = useState(true);
  const [loadingBusiness, setLoadingBusiness] = useState(true);
  const [loadingAgendas, setLoadingAgendas] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rules, setRules] = useState<RuleForm[]>([]);
  const [business, setBusiness] = useState<Pick<Business, 'name' | 'description' | 'slug'> | null>(null);
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
          setBusiness({ name: biz.name, description: biz.description, slug: biz.slug });
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{business?.name ?? '—'}</h2>
        <p className="text-sm text-muted-foreground">
          {business?.description?.trim() ? business.description : 'Sin descripción'}
        </p>

        {!loadingAgendas && agendasCount > 0 && business?.slug && (
          <div className="mt-3">
            <Button asChild variant="link" size="sm">
              <a href={`/${business.slug}`} target="_blank" rel="noreferrer noopener">
                <CalendarIcon/>Ver como cliente
              </a>
            </Button>
          </div>
        )}
      </div>

      {!businessId || loadingBusiness ? null : (
        <Tabs defaultValue="horarios" className="space-y-4">
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
                  <p className="text-sm text-muted-foreground">Cargando reglas...</p>
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
      )}
    </div>
  );
}

