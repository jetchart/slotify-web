import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { availabilityService } from '@/services/availability.service';
import { slotsService } from '@/services/slots.service';
import type { ResourceAvailabilityDayOverride, ResourceAvailabilityEffectiveRule } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Save, Plus, Trash2, X } from 'lucide-react';

const DAY_NAMES: Record<number, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  7: 'Domingo',
};

export default function ResourceAvailabilityEditor({ resourceId }: { resourceId: number }) {
  const [loading, setLoading] = useState(true);
  const [effectiveRules, setEffectiveRules] = useState<ResourceAvailabilityEffectiveRule[]>([]);
  const [dayOverrides, setDayOverrides] = useState<ResourceAvailabilityDayOverride[]>([]);

  const [savingOverrides, setSavingOverrides] = useState(false);
  const [overridesDirty, setOverridesDirty] = useState(false);
  const [daysToReplace, setDaysToReplace] = useState<Set<number>>(new Set());
  const [editingDayOfWeek, setEditingDayOfWeek] = useState<number | null>(null);
  const defaultOverrideRange = { startLocalTime: '09:00', endLocalTime: '18:00' };

  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);
  const [regenerateFrom, setRegenerateFrom] = useState(() => new Date().toISOString().split('T')[0]);
  const [regenerating, setRegenerating] = useState(false);

  const groupedEffectiveRules = useMemo(() => {
    const map = new Map<number, ResourceAvailabilityEffectiveRule[]>();
    effectiveRules.forEach((r) => {
      const list = map.get(r.dayOfWeek) ?? [];
      list.push(r);
      map.set(r.dayOfWeek, list);
    });

    return Array.from(map.entries())
      .map(([dayOfWeek, items]) => ({
        dayOfWeek,
        items: items.slice().sort((a, b) => a.startLocalTime.localeCompare(b.startLocalTime)),
      }))
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  }, [effectiveRules]);

  const groupedOverrides = useMemo(() => {
    const map = new Map<number, ResourceAvailabilityDayOverride[]>();
    dayOverrides.forEach((o) => {
      const list = map.get(o.dayOfWeek) ?? [];
      list.push(o);
      map.set(o.dayOfWeek, list);
    });

    return Array.from(map.entries())
      .map(([dayOfWeek, items]) => ({
        dayOfWeek,
        items: items.slice().sort((a, b) => a.startLocalTime.localeCompare(b.startLocalTime)),
      }))
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  }, [dayOverrides]);

  const overridesByDay = useMemo(() => {
    const m = new Map<number, ResourceAvailabilityDayOverride[]>();
    groupedOverrides.forEach((g) => m.set(g.dayOfWeek, g.items));
    return m;
  }, [groupedOverrides]);

  const baseByDay = useMemo(() => {
    const m = new Map<number, ResourceAvailabilityEffectiveRule[]>();
    groupedEffectiveRules.forEach((g) => m.set(g.dayOfWeek, g.items));
    return m;
  }, [groupedEffectiveRules]);

  useEffect(() => {
    const load = async () => {
      try {
        const [eff, overrides] = await Promise.all([
          availabilityService.getResourceEffectiveRules(resourceId),
          availabilityService.getResourceDayOverrides(resourceId),
        ]);
        setEffectiveRules(eff);
        setDayOverrides(overrides);
        setOverridesDirty(false);
        setDaysToReplace(new Set());
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [resourceId]);

  const handleSaveOverrides = async () => {
    if (!overridesDirty) return;
    if (daysToReplace.size === 0) return;
    setSavingOverrides(true);
    try {
      const rangesByDay = new Map<number, Array<{ startLocalTime: string; endLocalTime: string }>>();
      for (const o of dayOverrides) {
        const list = rangesByDay.get(o.dayOfWeek) ?? [];
        list.push({ startLocalTime: o.startLocalTime, endLocalTime: o.endLocalTime });
        rangesByDay.set(o.dayOfWeek, list);
      }

      const dtos = Array.from(daysToReplace).map((dayOfWeek) => {
        const ranges = rangesByDay.get(dayOfWeek) ?? [];
        // Si no quedan rangos => backend interpreta "inherit baseline".
        if (ranges.length === 0) return { dayOfWeek };
        return { dayOfWeek, ranges };
      });

      await availabilityService.upsertResourceDayOverrides(resourceId, dtos);
      toast.success('Overrides guardados');
      setRegenerateDialogOpen(true);

      const latest = await availabilityService.getResourceDayOverrides(resourceId);
      setDayOverrides(latest);
      setOverridesDirty(false);
      setEditingDayOfWeek(null);
      setDaysToReplace(new Set());
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar overrides');
    } finally {
      setSavingOverrides(false);
    }
  };

  const handleRegenerateSlots = async () => {
    setRegenerating(true);
    try {
      const res = await slotsService.regenerateForResource(resourceId, { from: regenerateFrom });
      toast.success(`Slots regenerados. Insertados: ${res.insertedSlots}`);
      setRegenerateDialogOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al regenerar slots');
    } finally {
      setRegenerating(false);
    }
  };

  const addOverrideRangeForDay = (dayOfWeek: number) => {
    setDaysToReplace((prev) => {
      const next = new Set(prev);
      next.add(dayOfWeek);
      return next;
    });
    setDayOverrides((prev) => [
      ...prev,
      {
        id: -Date.now(),
        resourceId,
        dayOfWeek,
        startLocalTime: defaultOverrideRange.startLocalTime,
        endLocalTime: defaultOverrideRange.endLocalTime,
      },
    ]);
    setOverridesDirty(true);
  };

  const updateOverrideRange = (
    overrideId: number,
    field: 'startLocalTime' | 'endLocalTime',
    value: string,
  ) => {
    setDayOverrides((prev) => prev.map((o) => (o.id === overrideId ? { ...o, [field]: value } : o)));
    setOverridesDirty(true);
  };

  const removeOverrideRange = (overrideId: number, dayOfWeek: number) => {
    setDaysToReplace((prev) => {
      const next = new Set(prev);
      next.add(dayOfWeek);
      return next;
    });
    setDayOverrides((prev) => prev.filter((o) => o.id !== overrideId));
    setOverridesDirty(true);
  };

  const removeCustomForDay = (dayOfWeek: number) => {
    // Eliminar custom implica: mandar al backend "inherit baseline" para ese día.
    // Esto tiene que disparar la request inmediatamente (no esperar a "Guardar").
    (async () => {
      setSavingOverrides(true);
      try {
        await availabilityService.upsertResourceDayOverrides(resourceId, [{ dayOfWeek }]);

        // Recargar todo para que tanto el display de overrides como effective-rules queden consistentes.
        const [eff, overrides] = await Promise.all([
          availabilityService.getResourceEffectiveRules(resourceId),
          availabilityService.getResourceDayOverrides(resourceId),
        ]);
        setEffectiveRules(eff);
        setDayOverrides(overrides);
        setOverridesDirty(false);
        setDaysToReplace(new Set());
        setEditingDayOfWeek(null);
        toast.success('Custom eliminado');
        setRegenerateDialogOpen(true);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Error al eliminar custom');
      } finally {
        setSavingOverrides(false);
      }
    })();
  };

  useEffect(() => {
    if (editingDayOfWeek == null) return;
    const remaining = dayOverrides.filter((o) => o.dayOfWeek === editingDayOfWeek).length;
    if (remaining === 0) {
      setEditingDayOfWeek(null);
    }
  }, [dayOverrides, editingDayOfWeek]);

  const handleCancelEditing = async () => {
    try {
      const latest = await availabilityService.getResourceDayOverrides(resourceId);
      setDayOverrides(latest);
      setOverridesDirty(false);
      setEditingDayOfWeek(null);
      setDaysToReplace(new Set());
      toast.success('Cambios descartados');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al cancelar');
    }
  };

  const startEditingDay = (dayOfWeek: number) => {
    setEditingDayOfWeek(dayOfWeek);
    setOverridesDirty(true);
    setDaysToReplace((prev) => {
      const next = new Set(prev);
      next.add(dayOfWeek);
      return next;
    });

    setDayOverrides((prev) => {
      const existing = prev.filter((o) => o.dayOfWeek === dayOfWeek).length;
      if (existing > 0) return prev;

      const baseItems = baseByDay.get(dayOfWeek) ?? [];
      const ranges: Array<{ startLocalTime: string; endLocalTime: string }> = baseItems.length > 0
        ? baseItems.map((r) => ({ startLocalTime: r.startLocalTime, endLocalTime: r.endLocalTime }))
        : [defaultOverrideRange];

      return [
        ...prev,
        ...ranges.map((r, idx) => ({
          id: -Date.now() - idx,
          resourceId,
          dayOfWeek,
          startLocalTime: r.startLocalTime,
          endLocalTime: r.endLocalTime,
        })),
      ];
    });
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Cargando disponibilidad...</p>;
  }

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => {
            const customItems = overridesByDay.get(dayOfWeek) ?? [];
            const baseItems = baseByDay.get(dayOfWeek) ?? [];
            const isCustom = customItems.length > 0;
            const isEditing = editingDayOfWeek === dayOfWeek;
            const appliedItems = isCustom ? customItems : baseItems;

            return (
              <div
                key={dayOfWeek}
                className="space-y-3 pb-2 border-b last:border-0 last:pb-0"
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Label className="text-base font-medium">
                      {DAY_NAMES[dayOfWeek] ?? `Día ${dayOfWeek}`}
                    </Label>
                    {isCustom && (
                      <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        custom
                      </span>
                    )}
                  </div>

                  {!isEditing ? (
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEditingDay(dayOfWeek)}
                        disabled={savingOverrides}
                      >
                        {isCustom ? 'Modificar' : 'Crear override'}
                      </Button>
                      {isCustom && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeCustomForDay(dayOfWeek)}
                          disabled={savingOverrides}
                        >
                          <Trash2 className="size-4 text-destructive mr-2" />
                          Eliminar custom
                        </Button>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Editando</span>
                  )}
                </div>

                {!isEditing ? (
                  appliedItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin rangos</p>
                  ) : (
                    <div className="space-y-2">
                      {appliedItems.map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                        >
                          <p className="font-medium truncate">
                            {r.startLocalTime} - {r.endLocalTime}
                          </p>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      {customItems.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Sin override para este día.</p>
                      ) : (
                        customItems.map((o) => (
                          <div
                            key={o.id}
                            className="flex flex-col sm:flex-row sm:items-end gap-2"
                          >
                            <div className="space-y-1 flex-1 sm:w-32">
                              <Label>Desde</Label>
                              <Input
                                type="time"
                                value={o.startLocalTime}
                                onChange={(e) => updateOverrideRange(o.id, 'startLocalTime', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1 flex-1 sm:w-32">
                              <Label>Hasta</Label>
                              <Input
                                type="time"
                                value={o.endLocalTime}
                                onChange={(e) => updateOverrideRange(o.id, 'endLocalTime', e.target.value)}
                              />
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                        onClick={() => removeOverrideRange(o.id, dayOfWeek)}
                              className="shrink-0"
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addOverrideRangeForDay(dayOfWeek)}
                      disabled={savingOverrides}
                    >
                      <Plus className="size-4" />
                      Agregar rango
                    </Button>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        onClick={handleSaveOverrides}
                        disabled={!overridesDirty || savingOverrides}
                      >
                        <Save className="size-4" />
                        {savingOverrides ? 'Guardando...' : 'Guardar'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleCancelEditing}
                        disabled={savingOverrides}
                      >
                        <X className="size-4" />
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </CardContent>
      </Card>

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
            <Button type="button" variant="outline" onClick={() => setRegenerateDialogOpen(false)} disabled={regenerating}>
              Omitir
            </Button>
            <Button type="button" onClick={handleRegenerateSlots} disabled={regenerating}>
              {regenerating ? 'Regenerando...' : 'Aceptar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

