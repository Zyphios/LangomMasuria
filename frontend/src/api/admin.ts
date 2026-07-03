import { apiClient } from './client';
import type { AdminBookingRow, BookingStatus, GalleryImage, ManualBookingPayload, PricingSeason } from '../types';

const withAuth = (token: string) => ({ Authorization: `Bearer ${token}` });

export const loginAdmin = (email: string, password: string) =>
  apiClient<{ token: string }>('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

export const getAdminBookings = (token: string) =>
  apiClient<AdminBookingRow[]>('/api/admin/bookings', { headers: withAuth(token) });

export const createManualBooking = (token: string, payload: ManualBookingPayload) =>
  apiClient<{ id: string; status: BookingStatus; totalPrice: number }>('/api/admin/bookings/manual', {
    method: 'POST',
    headers: withAuth(token),
    body: JSON.stringify(payload)
  });

export const updateBookingDeposit = (token: string, id: string, depositAmount: number) =>
  apiClient<{ depositAmount: string }>(`/api/admin/bookings/${id}/deposit`, {
    method: 'PATCH',
    headers: withAuth(token),
    body: JSON.stringify({ depositAmount })
  });

export const updateAdminBooking = (token: string, id: string, status: BookingStatus) =>
  apiClient<{ status: BookingStatus }>(`/api/admin/bookings/${id}`, {
    method: 'PATCH',
    headers: withAuth(token),
    body: JSON.stringify({ status })
  });

export const getAdminMessages = (token: string) =>
  apiClient<any[]>('/api/admin/messages', { headers: withAuth(token) });

export const markMessageRead = (token: string, id: string) =>
  apiClient<{ isRead: true }>(`/api/admin/messages/${id}`, {
    method: 'PATCH',
    headers: withAuth(token),
    body: JSON.stringify({ isRead: true })
  });

export const createBlockedDate = (token: string, date: string, reason?: string) =>
  apiClient<{ id: string; date: string; reason?: string }>('/api/admin/blocked-dates', {
    method: 'POST',
    headers: withAuth(token),
    body: JSON.stringify({ date, reason })
  });

export const createGalleryImage = (token: string, payload: Partial<GalleryImage>) =>
  apiClient<GalleryImage>('/api/admin/gallery', {
    method: 'POST',
    headers: withAuth(token),
    body: JSON.stringify(payload)
  });

export const updatePricingSeason = (token: string, pricing: PricingSeason) =>
  apiClient<PricingSeason>(`/api/admin/pricing/${pricing.id}`, {
    method: 'PATCH',
    headers: withAuth(token),
    body: JSON.stringify({
      namePl: pricing.namePl,
      nameEn: pricing.nameEn,
      pricePerNight: Number(pricing.pricePerNight),
      dateFrom: pricing.dateFrom,
      dateTo: pricing.dateTo,
      isFeatured: pricing.isFeatured
    })
  });
