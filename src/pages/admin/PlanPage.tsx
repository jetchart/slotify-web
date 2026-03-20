import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { businessService } from '@/services/business.service';
import type { Business, BusinessPlan } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, Zap, Sparkles, Crown } from 'lucide-react';

const PLANS: { id: BusinessPlan; name: string; description: string; icon: React.ElementType }[] = [
  { id: 'free', name: 'Free', description: 'Para empezar. Incluye lo esencial para gestionar turnos.', icon: Zap },
  { id: 'starter', name: 'Starter', description: 'Más capacidades para crecer. Ideal para negocios en expansión.', icon: Sparkles },
  { id: 'pro', name: 'Pro', description: 'Todo lo que necesitás. Para operaciones más demandantes.', icon: Crown },
];

function getPlanLabel(plan: BusinessPlan): string {
  return PLANS.find((p) => p.id === plan)?.name ?? plan;
}

function formatScheduledDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function PlanPage() {
  const { businessId } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<BusinessPlan | null>(null);

  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      return;
    }
    businessService
      .getById(businessId)
      .then(setBusiness)
      .catch(() => toast.error('Error al cargar el plan'))
      .finally(() => setLoading(false));
  }, [businessId]);

  const handleSelectPlan = async (plan: BusinessPlan) => {
    if (!businessId || business?.plan === plan) return;
    setUpdating(plan);
    try {
      const updated = await businessService.updatePlan(businessId, plan);
      setBusiness(updated);
      toast.success(`Plan actualizado a ${getPlanLabel(plan)}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al cambiar el plan');
    } finally {
      setUpdating(null);
    }
  };

  const currentPlan = business?.plan ?? 'free';

  if (!businessId) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold tracking-tight">Mi Plan</h2>
        <p className="text-muted-foreground text-sm">Creá un negocio primero para gestionar tu plan.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Mi Plan</h2>
        <p className="text-sm text-muted-foreground">
          Gestioná tu plan de suscripción y cambiá cuando lo necesites.
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full rounded-lg" />
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Plan actual</CardTitle>
              <CardDescription>Tu plan de suscripción vigente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge variant="secondary" className="text-sm px-3 py-1">
                {getPlanLabel(currentPlan)}
              </Badge>
              {business?.planExpiresAt && business?.scheduledPlanAtPeriodEnd && (
                <p className="text-sm text-muted-foreground">
                  El {formatScheduledDate(business.planExpiresAt)} pasarás al plan {getPlanLabel(business.scheduledPlanAtPeriodEnd)}.
                </p>
              )}
            </CardContent>
          </Card>

          <div>
            <h3 className="text-lg font-medium mb-3">Elegir plan</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              {PLANS.map(({ id, name, description, icon: Icon }) => {
                const isCurrent = currentPlan === id;
                const isUpdating = updating === id;
                return (
                  <Card
                    key={id}
                    className={isCurrent ? 'ring-2 ring-primary' : ''}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <Icon className="size-5 text-muted-foreground" />
                        {isCurrent && (
                          <Badge variant="outline" className="text-xs">
                            <Check className="size-3 mr-1" />
                            Actual
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg">{name}</CardTitle>
                      <CardDescription className="text-sm">{description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        variant={isCurrent ? 'secondary' : 'default'}
                        className="w-full"
                        disabled={isCurrent || isUpdating}
                        onClick={() => handleSelectPlan(id)}
                      >
                        {isUpdating ? 'Cambiando...' : isCurrent ? 'Plan actual' : `Elegir ${name}`}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
