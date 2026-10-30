export type Locale = 'pl' | 'en';

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';
export type ConfirmationView = {
  status: 'QUEUED' | 'SENDING' | 'SENT' | 'FAILED' | 'CANCELLED' | 'NOT_APPLICABLE' | 'NOT_RECORDED';
  attempts: number; sentAt: string | null; lastError: string | null;
};

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
  originalTotalPrice: string | null;
  discountPercent: string | null;
  depositAmount: string;
  expiresAt: string | null;
  confirmation: ConfirmationView;
};

export type BookingPriceInput =
  | { mode: 'amount'; totalPrice: number }
  | { mode: 'discount'; discountPercent: number };
export type BookingPriceResult = {
  totalPrice: string;
  originalTotalPrice: string;
  discountPercent: string | null;
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
  expiresAt: string | null;
};
export type VerificationResponse = { status: 'EMAIL_VERIFICATION_REQUIRED'; expiresAt: string };
export type BookingLinkPreview = { checkIn: string; checkOut: string; guestsCount: number; totalPrice: string; expiresAt: string };

export type AvailabilityResponse = {
  blockedDates: string[];
  pendingDates: string[];
  confirmedDates: string[];
  manualBlockedDates: string[];
};

export type ContactPayload = {
  name: string;
  email: string;
  message: string;
};

export type AdminMessage = ContactPayload & {
  id: string;
  isRead: boolean;
};

export type BookingWizardForm = BookingPayload & {
  totalPrice: number;
  bookingId?: string;
  reference?: string;
};
