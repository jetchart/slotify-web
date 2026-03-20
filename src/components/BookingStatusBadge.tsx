import { Badge } from '@/components/ui/badge';
import { BookingStatus } from '@/types';

interface BookingStatusBadgeProps {
  status: BookingStatus | string;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'secondary' | 'default' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pendiente', variant: 'secondary' },
  confirmed: { label: 'Confirmado', variant: 'default' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },
  no_show: { label: 'Ausente', variant: 'outline' },
};

export function BookingStatusBadge({ status }: BookingStatusBadgeProps) {
  const normalized = status?.toLowerCase?.() ?? status;
  const { label, variant } = STATUS_CONFIG[normalized] ?? { label: String(status ?? '—'), variant: 'outline' as const };

  return <Badge variant={variant}>{label}</Badge>;
}
