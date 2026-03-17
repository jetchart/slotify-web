import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { slotsService } from '@/services/slots.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CalendarClock } from 'lucide-react';

export default function SlotsPage() {
  const { businessId } = useAuth();
  const [from, setFrom] = useState(() => new Date().toISOString().split('T')[0]);
  const [days, setDays] = useState(14);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<number | null>(null);

  const handleGenerate = async () => {
    if (!businessId) {
      toast.error('No se encontró el business asociado');
      return;
    }
    setGenerating(true);
    setResult(null);
    try {
      const data = await slotsService.generate({ businessId, from, days });
      setResult(data.inserted);
      toast.success(`Se generaron ${data.inserted} slots`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al generar slots');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Generación de Slots</h2>
        <p className="text-sm text-muted-foreground">
          Generá los slots disponibles basándote en las reglas de disponibilidad de cada recurso.
        </p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="size-5" />
            Generar slots
          </CardTitle>
          <CardDescription>
            Los slots se crean a partir de las reglas de disponibilidad configuradas en cada recurso.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="from">Fecha desde</Label>
            <Input
              id="from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="days">Cantidad de días (1-60)</Label>
            <Input
              id="days"
              type="number"
              min={1}
              max={60}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            />
          </div>

          <Button onClick={handleGenerate} disabled={generating} className="w-full">
            {generating ? 'Generando...' : 'Generar slots'}
          </Button>

          {result !== null && (
            <div className="rounded-md bg-muted p-4 text-center">
              <p className="text-2xl font-bold">{result}</p>
              <p className="text-sm text-muted-foreground">slots generados</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
