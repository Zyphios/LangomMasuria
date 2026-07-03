import type { BookingStatus, Prisma } from '@prisma/client';
import type { Request } from 'express';

export type Locale = 'pl' | 'en';
export type JwtPayload = { adminId: string };
export type AuthenticatedRequest = Request & { adminId: string };
export type BookingCreateInput = {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkIn: string;
  checkOut: string;
  guestsCount: number;
  notes?: string;
  locale: Locale;
};
export type ManualBookingCreateInput = {
  guestName: string;
  guestEmail?: string;
  guestPhone: string;
  checkIn: string;
  checkOut: string;
  guestsCount: number;
  notes?: string;
  pricePerNight: number;
  discountPercent: number;
  depositAmount: number;
};
export type BookingStatusUpdate = { status: BookingStatus };
export type PaymentInitInput = { bookingId: string; amount: number };
export type PricingValue = Prisma.Decimal;
