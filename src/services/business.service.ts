import { apiGet, apiPost, apiPut } from '@/api';
import type { Business, CreateBusinessDto, UpdateBusinessDto } from '@/types';

export const businessService = {
  create(dto: CreateBusinessDto) {
    return apiPost<Business>('/businesses', dto);
  },

  update(businessId: number, dto: UpdateBusinessDto) {
    return apiPut<Business>(`/admin/businesses/${businessId}`, dto);
  },

  async getById(businessId: number) {
    // Endpoint admin para el panel.
    return apiGet<Business>(`/admin/businesses/${businessId}`);
  },

  async getByUserId(userId: string) {
    // userId es el `sub` del JWT (email).
    return apiGet<Business>(`/businesses/by-user/${encodeURIComponent(userId)}`);
  },

  async getBySlug(slug: string) {
    // Usado por el panel público de reservas.
    return apiGet<Business>(`/businesses/by-slug/${encodeURIComponent(slug)}`);
  },
};
