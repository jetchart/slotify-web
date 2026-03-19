import { apiDelete, apiGet, apiPost, apiPut } from '@/api';
import type {
  AvailabilityBlock,
  AvailabilityRule,
  CreateAvailabilityBlockDto,
  UpsertAvailabilityRuleDto,
} from '@/types';

export const availabilityService = {
  // --- Unified availability rules (business + resource) ---
  getBusinessRules(businessId: number) {
    return apiGet<AvailabilityRule[]>(`/admin/businesses/${businessId}/availability-rules`);
  },

  upsertBusinessRules(businessId: number, rules: UpsertAvailabilityRuleDto[]) {
    return apiPut<AvailabilityRule[]>(
      `/admin/businesses/${businessId}/availability-rules`,
      rules.map((r) => ({ ...r, businessId, resourceId: null })),
    );
  },

  getResourceRules(resourceId: number) {
    return apiGet<AvailabilityRule[]>(`/admin/resources/${resourceId}/availability-rules`);
  },

  upsertResourceRules(resourceId: number, rules: UpsertAvailabilityRuleDto[]) {
    return apiPut<AvailabilityRule[]>(
      `/admin/resources/${resourceId}/availability-rules`,
      rules,
    );
  },

  deleteResourceRule(resourceId: number, ruleId: number) {
    return apiDelete<void>(`/admin/resources/${resourceId}/availability-rules/${ruleId}`);
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

  deleteResourceBlock(resourceId: number, id: number) {
    return apiDelete<void>(`/admin/resources/${resourceId}/availability-blocks/${id}`);
  },
};
