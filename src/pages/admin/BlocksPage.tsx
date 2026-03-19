import { useAuth } from '@/context/AuthContext';
import BusinessBlocksManager from '@/components/BusinessBlocksManager';

export default function BlocksPage() {
  const { businessId } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Bloqueos</h2>
        <p className="text-sm text-muted-foreground">
          Bloqueos recurrentes por día de la semana (ej: todos los lunes de 12 a 13 almuerzo).
        </p>
      </div>

      {businessId && (
        <BusinessBlocksManager
          businessId={businessId}
          showResourceFilter={true}
        />
      )}
    </div>
  );
}
