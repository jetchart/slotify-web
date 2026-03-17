import { apiGet, apiPost } from '@/api';
import type { Slot, GenerateSlotsDto } from '@/types';

export const slotsService = {
  getPublicSlots(resourceId: number, date: string) {
    return apiGet<Slot[]>(`/public/resources/${resourceId}/slots`, { params: { date } });
  },

  generate(dto: GenerateSlotsDto) {
    return apiPost<{ inserted: number }>('/admin/slots/generate', dto);
  },
};
