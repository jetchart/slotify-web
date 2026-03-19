import { apiPost, apiGet, apiPut } from '@/api';
import type { Booking, PublicCreateBookingDto, BookingStatus } from '@/types';

export const bookingsService = {
  createPublic(dto: PublicCreateBookingDto) {
    return apiPost<Booking>('/public/bookings', dto);
  },

  cancel(bookingId: number) {
    return apiPost<Booking>(`/bookings/${bookingId}/cancel`);
  },

  getAll(params?: { businessId?: number; status?: string; from?: string; to?: string }) {
    return apiGet<Booking[]>('/admin/bookings', { params });
  },

  updateStatus(bookingId: number, status: BookingStatus) {
    return apiPut<Booking>(`/admin/bookings/${bookingId}`, { status });
  },

  updateNotes(bookingId: number, notes: string) {
    return apiPut<Booking>(`/admin/bookings/${bookingId}`, { notes });
  },
};
