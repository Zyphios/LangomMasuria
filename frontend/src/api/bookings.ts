import { apiClient } from './client';
import type { AvailabilityResponse, BookingPayload, BookingResponse } from '../types';

export const getAvailability = (month: number, year: number) =>
  apiClient<AvailabilityResponse>(`/api/availability?month=${month}&year=${year}`);

export const createBooking = (payload: BookingPayload) =>
  apiClient<BookingResponse>('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

export const initPayment = (bookingId: string, amount: number) =>
  apiClient<{ redirectUrl: string; orderId: string }>('/api/payment/init', {
    method: 'POST',
    body: JSON.stringify({ bookingId, amount })
  });
