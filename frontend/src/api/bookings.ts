import { apiClient } from './client';
import type { AvailabilityResponse, BookingPayload, BookingResponse, ProvisionalBookingResponse, BookingLinkPreview } from '../types';

export const getAvailability = (month: number, year: number) =>
  apiClient<AvailabilityResponse>(`/api/availability?month=${month}&year=${year}`);

export const createBooking = (payload: BookingPayload) =>
  apiClient<ProvisionalBookingResponse>('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

export const previewBookingLink = (kind: 'verification' | 'decision', token: string) =>
  apiClient<BookingLinkPreview>(`/api/booking-links/${kind}/preview`, { method: 'POST', body: JSON.stringify({ token }) });
export const completeBookingLink = (kind: 'verification' | 'decision', token: string, expectedTotalPrice: string, decision?: 'CONFIRMED' | 'CANCELLED') =>
  apiClient<BookingResponse>(`/api/booking-links/${kind}/complete`, { method: 'POST',
    body: JSON.stringify({ token, ...(kind === 'verification' ? { expectedTotalPrice } : { decision }) }) });

export const initPayment = (bookingId: string, amount: number) =>
  apiClient<{ redirectUrl: string; orderId: string }>('/api/payment/init', {
    method: 'POST',
    body: JSON.stringify({ bookingId, amount })
  });
