import { apiGet } from '@/api';
import type { Slot } from '@/types';

/** Slots calculados on-the-fly (no persisten en DB). GET /public/resources/:id/slots?date=YYYY-MM-DD */
export const slotsService = {
  getPublicSlots(resourceId: number, date: string) {
    return apiGet<Slot[]>(`/public/resources/${resourceId}/slots`, { params: { date } });
  },
};
