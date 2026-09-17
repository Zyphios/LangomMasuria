import nodemailer from 'nodemailer';
import { format } from 'date-fns';
import type { Booking, ContactMessage } from '@prisma/client';

const ownerEmail = process.env.OWNER_EMAIL || 'hello@lagommasuria.pl';
// Gmail (and most SMTP relays) reject mail whose "From" doesn't match the authenticated
// account, so the envelope sender must be the SMTP login, not the owner's inbox address.
const fromEmail = process.env.SMTP_USER || ownerEmail;

// Create transporter based on environment
const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || '' }
        : undefined,
    })
  : nodemailer.createTransport({ jsonTransport: true } as never);

// Never let a broken/misconfigured mail server block booking or contact-form submissions:
// log the failure and swallow it so the caller's request still succeeds.
const sendSafely = async (message: { to: string; subject: string; text: string }) => {
  try {
    await transporter.sendMail({ from: fromEmail, ...message });
  } catch (error) {
    console.error('Failed to send email:', error instanceof Error ? error.message : error);
  }
};

const date = (value: Date) => format(value, 'yyyy-MM-dd');

export const buildOwnerBookingEmail = (booking: Booking) => ({
  to: ownerEmail,
  subject: `Nowa rezerwacja ${booking.reference} — ${booking.guestName}`,
  text: [
    `Numer zgłoszenia: ${booking.reference}`,
    `Gość: ${booking.guestName}`,
    `Email: ${booking.guestEmail}`,
    `Telefon: ${booking.guestPhone}`,
    `Przyjazd: ${date(booking.checkIn)}`,
    `Wyjazd: ${date(booking.checkOut)}`,
    `Goście: ${booking.guestsCount}`,
    `Cena całkowita: ${booking.totalPrice.toString()} PLN`,
    `Notatki: ${booking.notes || '-'}`,
  ].join('\n'),
});

export const buildOwnerMessageEmail = (message: ContactMessage) => ({
  to: ownerEmail,
  subject: `Nowa wiadomość od ${message.name}`,
  text: [`Nadawca: ${message.name}`, `Email: ${message.email}`, '', message.message].join('\n'),
});

export const buildGuestConfirmationEmail = (booking: Booking & { guestEmail: string }) => ({
  to: booking.guestEmail,
  subject: booking.locale === 'en' ? 'Booking confirmation — Lagom Masuria' : 'Potwierdzenie rezerwacji — Lagom Masuria',
  text:
    booking.locale === 'en'
      ? [
          `Thank you, ${booking.guestName}!`,
          `Booking reference: ${booking.reference}`,
          `Stay: ${date(booking.checkIn)} - ${date(booking.checkOut)}`,
          `Total: ${booking.totalPrice.toString()} PLN`,
          'House rules:',
          '- check-in from 16:00',
          '- quiet hours 22:00-06:00',
          '- pets welcome',
          '- no smoking',
        ].join('\n')
      : [
          `Dziękujemy, ${booking.guestName}!`,
          `Numer rezerwacji: ${booking.reference}`,
          `Termin: ${date(booking.checkIn)} - ${date(booking.checkOut)}`,
          `Łącznie: ${booking.totalPrice.toString()} PLN`,
          'Zasady domu:',
          '- check-in od 16:00',
          '- cisza nocna 22:00-06:00',
          '- zwierzęta mile widziane',
          '- zakaz palenia',
        ].join('\n'),
});

export const sendOwnerBookingEmail = async (booking: Booking) => sendSafely(buildOwnerBookingEmail(booking));
export const sendOwnerMessageEmail = async (message: ContactMessage) => sendSafely(buildOwnerMessageEmail(message));
export const sendGuestConfirmationEmail = async (booking: Booking & { guestEmail: string }) =>
  sendSafely(buildGuestConfirmationEmail(booking));
