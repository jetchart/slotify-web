import { apiGet, apiPut } from '@/api';
import type { AvailabilityRule, UpsertAvailabilityRuleDto } from '@/types';

export const availabilityService = {
  getRules(resourceId: number) {
    return apiGet<AvailabilityRule[]>(`/admin/resources/${resourceId}/availability-rules`);
  },

  upsertRules(resourceId: number, rules: UpsertAvailabilityRuleDto[]) {
    return apiPut<AvailabilityRule[]>(`/admin/resources/${resourceId}/availability-rules`, rules);
  },
};
