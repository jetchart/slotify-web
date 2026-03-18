import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { availabilityService } from '@/services/availability.service';
import { businessService } from '@/services/business.service';
import { slotsService } from '@/services/slots.service';
import type { Business, UpsertBusinessAvailabilityRuleDto } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Save, Trash2 } from 'lucide-react';

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
  const [saving, setSaving] = useState(false);
  const [rules, setRules] = useState<RuleForm[]>([]);
  const [business, setBusiness] = useState<Pick<Business, 'name' | 'description'> | null>(null);
  const [showScheduleEditor, setShowScheduleEditor] = useState(false);

  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);
  const [regenerateFrom, setRegenerateFrom] = useState(() => new Date().toISOString().split('T')[0]);
  const [regenerating, setRegenerating] = useState(false);

  const defaultWeekdayRules: RuleForm[] = useMemo(
    () => [1, 2, 3, 4, 5].map((day) => ({ dayOfWeek: day, startLocalTime: '09:00', endLocalTime: '18:00' })),
    [],
  );

  useEffect(() => {
    const load = async () => {
      if (!businessId) {
        setLoadingRules(false);
        setLoadingBusiness(false);
        return;
      }
      // Cargamos primero las reglas y en paralelo los datos del negocio,
      // pero no dejamos que un 404 del business corte la experiencia.
      const rulesPromise = (async () => {
        try {
          const data = await availabilityService.getBusinessRules(businessId);
          if (data.length > 0) {
            setRules(
              data.map((r) => ({
                dayOfWeek: r.dayOfWeek,
                startLocalTime: r.startLocalTime,
                endLocalTime: r.endLocalTime,
              })),
            );
            setShowScheduleEditor(true);
          } else {
            // Si aún no hay availability definida a nivel Business, pedimos al usuario
            // que confirme la carga de defaults.
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
          setBusiness({ name: biz.name, description: biz.description });
        } catch {
          // Si el endpoint del negocio no existe en el backend,
          // igual mostramos días y horarios con placeholders.
          setBusiness(null);
        } finally {
          setLoadingBusiness(false);
        }
      })();

      await Promise.all([rulesPromise, businessPromise]);
    };
    load();
  }, [businessId, defaultWeekdayRules]);

  const addRuleForDay = (dayOfWeek: number) => (
    setRules((prev) => [...prev, { dayOfWeek, startLocalTime: '09:00', endLocalTime: '18:00' }])
  );
  const removeRule = (idx: number) => setRules((prev) => prev.filter((_, i) => i !== idx));
  const updateRule = (idx: number, field: keyof RuleForm, value: string | number) => {
    setRules((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  };

  const groupedRules = useMemo(() => {
    const map = new Map<number, { dayOfWeek: number; items: { idx: number; rule: RuleForm }[] }>();
    rules.forEach((rule, idx) => {
      if (!map.has(rule.dayOfWeek)) {
        map.set(rule.dayOfWeek, { dayOfWeek: rule.dayOfWeek, items: [] });
      }
      map.get(rule.dayOfWeek)?.items.push({ idx, rule });
    });
    const groups = Array.from(map.values());
    for (const g of groups) {
      g.items.sort((a, b) => a.rule.startLocalTime.localeCompare(b.rule.startLocalTime));
    }
    groups.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    return groups;
  }, [rules]);

  const handleSave = async () => {
    if (!businessId) return;
    if (!showScheduleEditor || rules.length === 0) return;
    setSaving(true);
    try {
      const payload: UpsertBusinessAvailabilityRuleDto[] = rules.map((r) => ({
        dayOfWeek: r.dayOfWeek,
        startLocalTime: r.startLocalTime,
        endLocalTime: r.endLocalTime,
      }));
      await availabilityService.upsertBusinessRules(businessId, payload);
      toast.success('Reglas del business guardadas');
      setRegenerateDialogOpen(true);
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

  const handleRegenerateSlots = async () => {
    if (!businessId) return;
    setRegenerating(true);
    try {
      const res = await slotsService.regenerateForBusiness(businessId, { from: regenerateFrom });
      toast.success(`Slots regenerados. Insertados: ${res.insertedSlots}`);
      setRegenerateDialogOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al regenerar slots');
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{business?.name ?? '—'}</h2>
        <p className="text-sm text-muted-foreground">
          {business?.description?.trim() ? business.description : 'Sin descripción'}
        </p>
      </div>

      {!businessId || loadingBusiness ? null : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">Días y horarios</CardTitle>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={loadingRules || saving || !businessId || !showScheduleEditor || rules.length === 0}
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
                    groupedRules.map((group) => (
                      <div
                        key={group.dayOfWeek}
                        className="space-y-3 pb-2 border-b last:border-0 last:pb-0"
                      >
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <Label className="text-base font-medium">
                            {DAY_NAMES[group.dayOfWeek] ?? `Día ${group.dayOfWeek}`}
                          </Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addRuleForDay(group.dayOfWeek)}
                            disabled={loadingRules || saving}
                          >
                            <Plus className="size-4" />
                            Agregar rango
                          </Button>
                        </div>

                        <div className="space-y-2">
                          {group.items.map(({ idx, rule }) => (
                            <div
                              key={idx}
                              className="flex flex-col sm:flex-row sm:items-end gap-2"
                            >
                              <div className="space-y-1 flex-1 sm:w-32">
                                <Label>Desde</Label>
                                <Input
                                  type="time"
                                  value={rule.startLocalTime}
                                  onChange={(e) => updateRule(idx, 'startLocalTime', e.target.value)}
                                />
                              </div>
                              <div className="space-y-1 flex-1 sm:w-32">
                                <Label>Hasta</Label>
                                <Input
                                  type="time"
                                  value={rule.endLocalTime}
                                  onChange={(e) => updateRule(idx, 'endLocalTime', e.target.value)}
                                />
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeRule(idx)}
                                className="shrink-0"
                              >
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={regenerateDialogOpen} onOpenChange={setRegenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerar slots</DialogTitle>
            <DialogDescription>
              ¿Desea regenerar los slots según la disponibilidad actual?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="regenerate-from">A partir de</Label>
            <Input
              id="regenerate-from"
              type="date"
              value={regenerateFrom}
              onChange={(e) => setRegenerateFrom(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRegenerateDialogOpen(false)}
              disabled={regenerating}
            >
              Omitir
            </Button>
            <Button type="button" onClick={handleRegenerateSlots} disabled={regenerating}>
              {regenerating ? 'Regenerando...' : 'Aceptar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

