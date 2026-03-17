import { apiPost } from '@/api';
import type { Business, CreateBusinessDto } from '@/types';

export const businessService = {
  create(dto: CreateBusinessDto) {
    return apiPost<Business>('/businesses', dto);
  },
};
