import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { availabilityService } from '@/services/availability.service';
import type { AvailabilityRule } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Plus, Trash2, Info } from 'lucide-react';
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
  id?: number;
  dayOfWeek: number;
  startLocalTime: string;
  endLocalTime: string;
}

export default function ResourceAvailabilityEditor({
  resourceId,
  businessId,
}: {
  resourceId: number;
  businessId: number;
}) {
  const [loading, setLoading] = useState(true);
  const [resourceRules, setResourceRules] = useState<RuleForm[]>([]);
  const [businessRules, setBusinessRules] = useState<AvailabilityRule[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadRules();
  }, [resourceId]);

  const loadRules = async () => {
    setLoading(true);
    try {
      const [resourceData, businessData] = await Promise.all([
        availabilityService.getResourceRules(resourceId),
        availabilityService.getBusinessRules(businessId),
      ]);

      setResourceRules(
        resourceData.map((r) => ({
          id: r.id,
          dayOfWeek: r.dayOfWeek,
          startLocalTime: r.startLocalTime,
          endLocalTime: r.endLocalTime,
        })),
      );

      setBusinessRules(businessData.filter((r) => !r.resourceId));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar reglas');
    } finally {
      setLoading(false);
    }
  };

  const rulesByDay = useMemo(() => {
    const map = new Map<number, RuleForm>();
    resourceRules.forEach((rule) => {
      map.set(rule.dayOfWeek, rule);
    });
    return map;
  }, [resourceRules]);

  const businessRulesByDay = useMemo(() => {
    const map = new Map<number, AvailabilityRule>();
    businessRules.forEach((rule) => {
      map.set(rule.dayOfWeek, rule);
    });
    return map;
  }, [businessRules]);

  const handleSave = async () => {
    if (resourceRules.length === 0) {
      toast.error('Agregá al menos una regla');
      return;
    }
    setSaving(true);
    try {
      const payload = resourceRules.map((r) => ({
        businessId,
        resourceId,
        dayOfWeek: r.dayOfWeek,
        startLocalTime: r.startLocalTime,
        endLocalTime: r.endLocalTime,
      }));
      await availabilityService.upsertResourceRules(resourceId, payload);
      toast.success('Reglas guardadas');
      loadRules();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const addOrEditRuleForDay = (dayOfWeek: number) => {
    const existing = rulesByDay.get(dayOfWeek);
    if (existing) {
      return;
    }

    const inheritedRule = businessRulesByDay.get(dayOfWeek);
    const defaultTime = inheritedRule
      ? { startLocalTime: inheritedRule.startLocalTime, endLocalTime: inheritedRule.endLocalTime }
      : { startLocalTime: '09:00', endLocalTime: '18:00' };

    setResourceRules((prev) => [...prev, { dayOfWeek, ...defaultTime }]);
  };

  const removeRule = (dayOfWeek: number) => {
    setResourceRules((prev) => prev.filter((r) => r.dayOfWeek !== dayOfWeek));
  };

  const updateRule = (dayOfWeek: number, field: 'startLocalTime' | 'endLocalTime', value: string) => {
    setResourceRules((prev) =>
      prev.map((r) => (r.dayOfWeek === dayOfWeek ? { ...r, [field]: value } : r)),
    );
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Cargando disponibilidad...</p>;
  }

  return (
    <>
      <Tabs defaultValue="horarios" className="space-y-4">
        <TabsList>
          <TabsTrigger value="horarios">Horarios</TabsTrigger>
          <TabsTrigger value="excepciones">Excepciones</TabsTrigger>
          <TabsTrigger value="bloqueos">Bloqueos</TabsTrigger>
        </TabsList>

        <TabsContent value="horarios">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Reglas de disponibilidad
                <span className="text-xs text-muted-foreground font-normal">
                  (1 regla por día)
                </span>
              </CardTitle>
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <Info className="size-4 mt-0.5 shrink-0" />
                <p>
                  Esta agenda hereda las reglas del negocio. Agregá reglas aquí solo si necesitás
                  horarios diferentes. Para bloquear horarios dentro del rango, usá la sección "Bloqueos".
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => {
                const resourceRule = rulesByDay.get(dayOfWeek);
                const businessRule = businessRulesByDay.get(dayOfWeek);
                const hasCustomRule = !!resourceRule;

                return (
                  <div key={dayOfWeek} className="space-y-3 pb-2 border-b last:border-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Label className="text-base font-medium">
                          {DAY_NAMES[dayOfWeek] ?? `Día ${dayOfWeek}`}
                        </Label>
                        {hasCustomRule && (
                          <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary font-medium">
                            Personalizado
                          </span>
                        )}
                      </div>

                      {!hasCustomRule && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addOrEditRuleForDay(dayOfWeek)}
                          disabled={saving}
                        >
                          <Plus className="size-3 mr-1" />
                          Personalizar
                        </Button>
                      )}
                    </div>

                    {hasCustomRule ? (
                      <div className="space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                          <div className="space-y-1 flex-1 sm:w-32">
                            <Label>Desde</Label>
                            <Input
                              type="time"
                              value={resourceRule.startLocalTime}
                              onChange={(e) => updateRule(dayOfWeek, 'startLocalTime', e.target.value)}
                            />
                          </div>
                          <div className="space-y-1 flex-1 sm:w-32">
                            <Label>Hasta</Label>
                            <Input
                              type="time"
                              value={resourceRule.endLocalTime}
                              onChange={(e) => updateRule(dayOfWeek, 'endLocalTime', e.target.value)}
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeRule(dayOfWeek)}
                            className="shrink-0"
                            title="Volver a heredar del negocio"
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ) : businessRule ? (
                      <div className="text-sm text-muted-foreground pl-2 border-l-2 border-muted">
                        Heredado: {businessRule.startLocalTime.slice(0, 5)} - {businessRule.endLocalTime.slice(0, 5)}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground pl-2 border-l-2 border-muted">
                        Cerrado
                      </div>
                    )}
                  </div>
                );
              })}

              {resourceRules.length > 0 && (
                <div className="pt-4 flex justify-end">
                  <Button onClick={handleSave} disabled={saving}>
                    <Save className="size-4 mr-2" />
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                  </Button>
                </div>
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
              <BusinessExceptionsManager 
                businessId={businessId} 
                resourceId={resourceId}
                showResourceFilter={false}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bloqueos">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bloqueos de tiempo</CardTitle>
            </CardHeader>
            <CardContent>
              <BusinessBlocksManager 
                businessId={businessId} 
                resourceId={resourceId}
                showResourceFilter={false}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
