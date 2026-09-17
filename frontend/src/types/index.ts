export type Locale = 'pl' | 'en';

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export type BookingSource = 'WEBSITE' | 'MANUAL';

export type AdminBookingRow = {
  id: string;
  reference: string;
  guestName: string;
  guestEmail: string | null;
  guestPhone: string;
  status: BookingStatus;
  source: BookingSource;
  checkIn: string;
  checkOut: string;
  totalPrice: string;
  depositAmount: string;
};

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

export type ManualBookingPayload = {
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

export type BookingResponse = {
  id: string;
  reference: string;
  status: BookingStatus;
  totalPrice: number;
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
  reference?: string;
};
