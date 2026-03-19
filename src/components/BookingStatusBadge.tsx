import { Badge } from '@/components/ui/badge';
import { BookingStatus } from '@/types';

interface BookingStatusBadgeProps {
  status: BookingStatus;
}

export function BookingStatusBadge({ status }: BookingStatusBadgeProps) {
  const config = {
    pending: { label: 'Pendiente', variant: 'secondary' as const },
    confirmed: { label: 'Confirmado', variant: 'default' as const },
    cancelled: { label: 'Cancelado', variant: 'destructive' as const },
    no_show: { label: 'Ausente', variant: 'outline' as const },
  };

  const { label, variant } = config[status];

  return <Badge variant={variant}>{label}</Badge>;
}
