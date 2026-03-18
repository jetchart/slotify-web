import { apiDelete, apiGet, apiPost, apiPut } from '@/api';
import type {
  AvailabilityBlock,
  BusinessAvailabilityRule,
  CreateAvailabilityBlockDto,
  ResourceAvailabilityDayOverride,
  ResourceAvailabilityEffectiveRule,
  UpsertBusinessAvailabilityRuleDto,
  UpsertResourceDayOverrideDto,
} from '@/types';

export const availabilityService = {
  // --- Business rules ---
  getBusinessRules(businessId: number) {
    return apiGet<BusinessAvailabilityRule[]>(`/admin/businesses/${businessId}/availability-rules`);
  },

  upsertBusinessRules(businessId: number, rules: UpsertBusinessAvailabilityRuleDto[]) {
    return apiPut<BusinessAvailabilityRule[]>(`/admin/businesses/${businessId}/availability-rules`, rules);
  },

  // --- Resource availability (day overrides + effective rules) ---
  getResourceEffectiveRules(resourceId: number) {
    return apiGet<ResourceAvailabilityEffectiveRule[]>(
      `/admin/resources/${resourceId}/availability/effective-rules`,
    );
  },

  getResourceDayOverrides(resourceId: number) {
    return apiGet<ResourceAvailabilityDayOverride[]>(
      `/admin/resources/${resourceId}/availability/day-overrides`,
    );
  },

  upsertResourceDayOverrides(resourceId: number, overrides: UpsertResourceDayOverrideDto[]) {
    // backend: PUT /admin/resources/:resourceId/availability (parcial por día)
    return apiPut<{
      overrides: ResourceAvailabilityDayOverride[];
      rules: any[];
    }>(
      `/admin/resources/${resourceId}/availability`,
      overrides,
    );
  },

  // --- Blocks ---
  listBusinessBlocks(businessId: number, resourceId?: number) {
    return apiGet<AvailabilityBlock[]>(
      `/admin/businesses/${businessId}/availability-blocks`,
      { params: resourceId ? { resourceId } : undefined },
    );
  },

  createBusinessBlock(businessId: number, dto: CreateAvailabilityBlockDto) {
    return apiPost<AvailabilityBlock>(
      `/admin/businesses/${businessId}/availability-blocks`,
      dto,
    );
  },

  deleteBusinessBlock(businessId: number, id: number) {
    return apiDelete<void>(`/admin/businesses/${businessId}/availability-blocks/${id}`);
  },

  listResourceBlocks(resourceId: number) {
    return apiGet<AvailabilityBlock[]>(`/admin/resources/${resourceId}/availability-blocks`);
  },

  createResourceBlock(resourceId: number, dto: CreateAvailabilityBlockDto) {
    return apiPost<AvailabilityBlock>(`/admin/resources/${resourceId}/availability-blocks`, dto);
  },
};
