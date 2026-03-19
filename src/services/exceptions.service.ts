import { apiDelete, apiGet, apiPost, apiPut } from '@/api';
import type { Exception } from '@/types';

export interface CreateExceptionDto {
  businessId: number;
  resourceId?: number | null;
  dateFrom: string;
  dateTo: string;
  isClosed: boolean;
  isBlockedRange: boolean;
  startTime?: string | null;
  endTime?: string | null;
  description?: string | null;
}

export interface UpdateExceptionDto {
  dateFrom?: string;
  dateTo?: string;
  isClosed?: boolean;
  isBlockedRange?: boolean;
  startTime?: string | null;
  endTime?: string | null;
  resourceId?: number | null;
  description?: string | null;
}

export const exceptionsService = {
  // Business exceptions
  getAll(businessId: number, params?: { from?: string; to?: string; resourceId?: number }) {
    return apiGet<Exception[]>(`/admin/businesses/${businessId}/exceptions`, { params });
  },

  create(dto: CreateExceptionDto) {
    if (dto.resourceId) {
      return apiPost<Exception>(`/admin/resources/${dto.resourceId}/exceptions`, dto);
    }
    return apiPost<Exception>(`/admin/businesses/${dto.businessId}/exceptions`, dto);
  },

  update(businessId: number, exceptionId: number, dto: UpdateExceptionDto) {
    return apiPut<Exception>(`/admin/businesses/${businessId}/exceptions/${exceptionId}`, dto);
  },

  delete(businessId: number, exceptionId: number, resourceId?: number) {
    if (resourceId) {
      return apiDelete<void>(`/admin/resources/${resourceId}/exceptions/${exceptionId}`);
    }
    return apiDelete<void>(`/admin/businesses/${businessId}/exceptions/${exceptionId}`);
  },
};
