export const CLEANING_FEE = 200;

export type Locale = 'pl' | 'en';

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export type GalleryImage = {
  id: string;
  url: string;
  captionPl: string | null;
  captionEn: string | null;
  sortOrder: number;
};

export type PricingSeason = {
  id: string;
  namePl: string;
  nameEn: string;
  pricePerNight: string;
  dateFrom: string;
  dateTo: string;
  isFeatured: boolean;
};

export type BookingPayload = {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkIn: string;
  checkOut: string;
  guestsCount: number;
  notes?: string;
  locale: Locale;
};

export type BookingResponse = {
  id: string;
  status: BookingStatus;
};

export type AvailabilityResponse = {
  blockedDates: string[];
};

export type ContactPayload = {
  name: string;
  email: string;
  message: string;
};

export type BookingWizardForm = BookingPayload & {
  totalPrice: number;
  bookingId?: string;
  orderId?: string;
};
