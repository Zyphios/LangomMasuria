import type { Booking, ContactMessage } from '@prisma/client';

// Stub implementations - will be replaced in Task 9
export const sendOwnerBookingEmail = async (booking: Booking) => {
  console.log('Email stub: sendOwnerBookingEmail', booking.id);
};

export const sendOwnerMessageEmail = async (message: ContactMessage) => {
  console.log('Email stub: sendOwnerMessageEmail', message.id);
};

export const sendGuestConfirmationEmail = async (booking: Booking) => {
  console.log('Email stub: sendGuestConfirmationEmail', booking.id);
};
