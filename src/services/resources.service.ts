import { apiGet, apiPost, apiPatch } from '@/api';
import type { Resource, CreateResourceDto, UpdateResourceDto } from '@/types';

export const resourcesService = {
  getAll(businessId: number) {
    return apiGet<Resource[]>(`/admin/resources`, { params: { businessId } });
  },

  getPublic(businessId: number) {
    return apiGet<Resource[]>(`/public/businesses/${businessId}/resources`);
  },

  create(dto: CreateResourceDto) {
    return apiPost<Resource>('/admin/resources', dto);
  },

  update(id: number, dto: UpdateResourceDto) {
    return apiPatch<Resource>(`/admin/resources/${id}`, dto);
  },
};
