import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import ResourceAvailabilityEditor from '@/pages/admin/ResourceAvailabilityEditor';

export default function AvailabilityPage() {
  const { id } = useParams<{ id: string }>();
  const { businessId } = useAuth();
  const resourceId = Number(id);
  const navigate = useNavigate();

  if (!businessId) {
    return <p className="text-sm text-muted-foreground">No se encontró el negocio.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/resources')}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Disponibilidad</h2>
          <p className="text-sm text-muted-foreground">
            Agenda #{resourceId} — reglas de disponibilidad.
          </p>
        </div>
      </div>

      <ResourceAvailabilityEditor resourceId={resourceId} businessId={businessId} />
    </div>
  );
}
