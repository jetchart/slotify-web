import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { availabilityService } from '@/services/availability.service';
import type { ResourceAvailabilityDayOverride, ResourceAvailabilityEffectiveRule } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ResourceAvailabilityEditor from '@/pages/admin/ResourceAvailabilityEditor';

const DAY_NAMES: Record<number, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  7: 'Domingo',
};

export default function AvailabilityPage() {
  const { id } = useParams<{ id: string }>();
  const resourceId = Number(id);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [effectiveRules, setEffectiveRules] = useState<ResourceAvailabilityEffectiveRule[]>([]);
  const [dayOverrides, setDayOverrides] = useState<ResourceAvailabilityDayOverride[]>([]);

  const [savingOverrides, setSavingOverrides] = useState(false);
  const [overridesDirty, setOverridesDirty] = useState(false);
  const defaultOverrideRange = { startLocalTime: '09:00', endLocalTime: '18:00' };

  const groupedEffectiveRules = useMemo(() => {
    const map = new Map<number, ResourceAvailabilityEffectiveRule[]>();
    effectiveRules.forEach((r) => {
      const list = map.get(r.dayOfWeek) ?? [];
      list.push(r);
      map.set(r.dayOfWeek, list);
    });
    const groups = Array.from(map.entries()).map(([dayOfWeek, items]) => ({
      dayOfWeek,
      items: items.slice().sort((a, b) => a.startLocalTime.localeCompare(b.startLocalTime)),
    }));
    groups.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    return groups;
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
    setSavingOverrides(true);
    try {
      const rangesByDay = new Map<number, Array<{ startLocalTime: string; endLocalTime: string }>>();
      for (const o of dayOverrides) {
        const list = rangesByDay.get(o.dayOfWeek) ?? [];
        list.push({ startLocalTime: o.startLocalTime, endLocalTime: o.endLocalTime });
        rangesByDay.set(o.dayOfWeek, list);
      }

      const dtos = Array.from(rangesByDay.entries()).map(([dayOfWeek, ranges]) => ({ dayOfWeek, ranges }));
      await availabilityService.upsertResourceDayOverrides(resourceId, dtos);
      toast.success('Overrides guardados');
      const latest = await availabilityService.getResourceDayOverrides(resourceId);
      setDayOverrides(latest);
      setOverridesDirty(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar overrides');
    } finally {
      setSavingOverrides(false);
    }
  };

  const addOverrideRangeForDay = (dayOfWeek: number) => {
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
    setDayOverrides((prev) =>
      prev.map((o) => (o.id === overrideId ? { ...o, [field]: value } : o)),
    );
    setOverridesDirty(true);
  };

  const removeOverrideRange = (overrideId: number) => {
    setDayOverrides((prev) => prev.filter((o) => o.id !== overrideId));
    setOverridesDirty(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/resources')}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Disponibilidad</h2>
          <p className="text-sm text-muted-foreground">Agenda #{resourceId} — reglas y overrides por día.</p>
        </div>
      </div>

      <ResourceAvailabilityEditor resourceId={resourceId} />
    </div>
  );
}
