import { apiPost } from '@/api';
import type { Booking, PublicCreateBookingDto } from '@/types';

export const bookingsService = {
  createPublic(dto: PublicCreateBookingDto) {
    return apiPost<Booking>('/public/bookings', dto);
  },

  cancel(bookingId: number) {
    return apiPost<Booking>(`/bookings/${bookingId}/cancel`);
  },
};
