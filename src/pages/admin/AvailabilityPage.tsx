import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { availabilityService } from '@/services/availability.service';
import type { UpsertAvailabilityRuleDto } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

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

export default function AvailabilityPage() {
  const { id } = useParams<{ id: string }>();
  const resourceId = Number(id);
  const navigate = useNavigate();
  const [rules, setRules] = useState<RuleForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const defaultWeekdayRules: RuleForm[] = [1, 2, 3, 4, 5].map((day) => ({
    dayOfWeek: day,
    startLocalTime: '09:00',
    endLocalTime: '18:00',
  }));

  useEffect(() => {
    const load = async () => {
      try {
        const data = await availabilityService.getRules(resourceId);
        setRules(
          data.length > 0
            ? data.map((r) => ({
                dayOfWeek: r.dayOfWeek,
                startLocalTime: r.startLocalTime,
                endLocalTime: r.endLocalTime,
              }))
            : defaultWeekdayRules,
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [resourceId]);

  const addRule = () => {
    setRules((prev) => [...prev, { dayOfWeek: 1, startLocalTime: '09:00', endLocalTime: '18:00' }]);
  };

  const removeRule = (idx: number) => {
    setRules((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateRule = (idx: number, field: keyof RuleForm, value: string | number) => {
    setRules((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const dtos: UpsertAvailabilityRuleDto[] = rules.map((r) => ({
        dayOfWeek: r.dayOfWeek,
        startLocalTime: r.startLocalTime,
        endLocalTime: r.endLocalTime,
      }));
      await availabilityService.upsertRules(resourceId, dtos);
      toast.success('Reglas de disponibilidad guardadas');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/resources')}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Disponibilidad</h2>
          <p className="text-sm text-muted-foreground">Recurso #{resourceId} — Configurá los horarios disponibles por día.</p>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Cargando...</p>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Reglas de disponibilidad</CardTitle>
            <Button variant="outline" size="sm" onClick={addRule}>
              <Plus className="size-4" />
              Agregar regla
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {rules.length === 0 && (
              <p className="text-muted-foreground text-sm">
                No hay reglas configuradas. Agregá al menos una para generar slots.
              </p>
            )}
            {rules.map((rule, idx) => (
              <div key={idx} className="flex items-end gap-3">
                <div className="space-y-1 flex-1">
                  <Label>Día</Label>
                  <Select
                    value={String(rule.dayOfWeek)}
                    onValueChange={(v) => updateRule(idx, 'dayOfWeek', Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(DAY_NAMES).map(([val, name]) => (
                        <SelectItem key={val} value={val}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Desde</Label>
                  <Input
                    type="time"
                    value={rule.startLocalTime}
                    onChange={(e) => updateRule(idx, 'startLocalTime', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Hasta</Label>
                  <Input
                    type="time"
                    value={rule.endLocalTime}
                    onChange={(e) => updateRule(idx, 'endLocalTime', e.target.value)}
                  />
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeRule(idx)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))}
            <div className="flex justify-end pt-4">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
