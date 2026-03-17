import { apiGet } from '@/api';
import type { User } from '@/types';

export const usersService = {
  getAdmins() {
    return apiGet<User[]>('/users/admin');
  },

  getNonAdmins() {
    return apiGet<User[]>('/users/not-admin');
  },
};
