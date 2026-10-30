import nodemailer from 'nodemailer';
import { format } from 'date-fns';
import { Prisma, type Booking, type ContactMessage } from '@prisma/client';
import type { BookingCreateInput } from '../types';
import { bookingLink } from './bookingLinks';

const ownerEmail = process.env.OWNER_EMAIL || 'domeknamazurskiej@gmail.com';
// Gmail (and most SMTP relays) reject mail whose "From" doesn't match the authenticated
// account, so the envelope sender must be the SMTP login, not the owner's inbox address.
const fromEmail = process.env.SMTP_USER || ownerEmail;

// Create transporter based on environment
const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 30000,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || '' }
        : undefined,
    })
  : null;

type MailMessage = { to: string; subject: string; text: string; html?: string };
const sendStrictly = async (message: MailMessage) => {
  if (!transporter) throw new Error('SMTP_NOT_CONFIGURED');
  await transporter.sendMail({ from: fromEmail, ...message });
};

// Never let a broken/misconfigured mail server block booking or contact-form submissions:
// log the failure and swallow it so the caller's request still succeeds.
const sendSafely = async (message: MailMessage) => {
  try {
    await sendStrictly(message);
  } catch {
    console.error('Owner notification delivery failed; check SMTP configuration and the admin panel.');
  }
};

const date = (value: Date) => format(value, 'yyyy-MM-dd');

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] ?? char));

export const buildOwnerBookingEmail = (booking: Booking, token?: string) => {
  const actions = token ? [
    { label: 'Potwierdź', url: bookingLink('/booking-decision', token, 'CONFIRMED') },
    { label: 'Odrzuć', url: bookingLink('/booking-decision', token, 'CANCELLED') }
  ] : [];
  const text = [
    `Numer zgłoszenia: ${booking.reference}`, `Gość: ${booking.guestName}`, `Email: ${booking.guestEmail}`,
    `Telefon: ${booking.guestPhone}`, `Przyjazd: ${date(booking.checkIn)}`, `Wyjazd: ${date(booking.checkOut)}`,
    `Goście: ${booking.guestsCount}`, `Cena całkowita: ${booking.totalPrice.toString()} PLN`,
    `Notatki: ${booking.notes || '-'}`,
    ...(token ? [`Decyzja do: ${booking.expiresAt?.toISOString()}`, 'Prywatne linki — nie przekazuj tego maila innym osobom.',
      'Otwarcie linku nie podejmuje decyzji. Zatwierdź ją na stronie.',
      ...actions.map((action) => `${action.label}: ${action.url}`)] : [])
  ].join('\n');
  return {
  to: ownerEmail,
  subject: `Nowa rezerwacja ${booking.reference} — ${booking.guestName}`,
  text,
  html: `<pre style="white-space:pre-wrap">${escapeHtml(text)}</pre>${actions.map((action) =>
    `<p><a style="display:inline-block;padding:14px 24px;background:#455538;color:white" href="${escapeHtml(action.url)}">${action.label}</a></p>`).join('')}`
  };
};

export const buildOwnerMessageEmail = (message: ContactMessage) => ({
  to: ownerEmail,
  subject: `Nowa wiadomość od ${message.name}`,
  text: [`Nadawca: ${message.name}`, `Email: ${message.email}`, '', message.message].join('\n'),
});

export const buildGuestConfirmationEmail = (booking: Booking & { guestEmail: string }) => {
  const remaining = Prisma.Decimal.max(booking.totalPrice.minus(booking.depositAmount), 0);
  const overpayment = Prisma.Decimal.max(booking.depositAmount.minus(booking.totalPrice), 0);
  return {
    to: booking.guestEmail,
    subject: booking.locale === 'en' ? 'Booking confirmation — Domek na Mazurskiej' : 'Potwierdzenie rezerwacji — Domek na Mazurskiej',
    text:
      booking.locale === 'en'
        ? [
            `Thank you, ${booking.guestName}!`,
            `Booking reference: ${booking.reference}`,
            `Stay: ${date(booking.checkIn)} - ${date(booking.checkOut)}`,
            `Total: ${booking.totalPrice.toFixed(2)} PLN`,
            `Deposit paid: ${booking.depositAmount.toFixed(2)} PLN`,
            `Remaining on arrival: ${remaining.toFixed(2)} PLN`,
            ...(overpayment.gt(0) ? [`Overpayment: ${overpayment.toFixed(2)} PLN`] : []),
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
            `Łącznie: ${booking.totalPrice.toFixed(2)} PLN`,
            `Wpłacona zaliczka: ${booking.depositAmount.toFixed(2)} PLN`,
            `Do dopłaty na miejscu: ${remaining.toFixed(2)} PLN`,
            ...(overpayment.gt(0) ? [`Nadpłata: ${overpayment.toFixed(2)} PLN`] : []),
            'Zasady domu:',
            '- check-in od 16:00',
            '- cisza nocna 22:00-06:00',
            '- zwierzęta mile widziane',
            '- zakaz palenia',
          ].join('\n'),
  };
};

export const buildBookingVerificationEmail = (input: BookingCreateInput, token: string, expiresAt: Date) => {
  const english = input.locale === 'en';
  const link = bookingLink('/verify-booking', token);
  const label = english ? 'Review and verify request' : 'Sprawdź i potwierdź zgłoszenie';
  const text = [
    english ? 'Verify your email — Domek na Mazurskiej' : 'Potwierdź adres e-mail — Domek na Mazurskiej',
    `${input.checkIn} — ${input.checkOut}`,
    english ? 'Your dates are NOT held yet. Verify within 15 minutes; availability and price will be checked again.'
      : 'Termin NIE jest jeszcze blokowany. Potwierdź w ciągu 15 minut; sprawdzimy ponownie dostępność i cenę.',
    `${english ? 'Valid until' : 'Ważne do'}: ${expiresAt.toISOString()}`,
    `${label}: ${link}`,
    english ? 'If you did not request this, ignore this email.' : 'Jeżeli to nie Twoje zgłoszenie, zignoruj wiadomość.'
  ].join('\n');
  return { to: input.guestEmail.trim().toLowerCase(), subject: english ? 'Verify your request — Domek na Mazurskiej' : 'Potwierdź zgłoszenie — Domek na Mazurskiej',
    text, html: `<pre style="white-space:pre-wrap">${escapeHtml(text)}</pre><p><a href="${escapeHtml(link)}">${label}</a></p>` };
};

export const sendBookingVerificationEmail = (input: BookingCreateInput, token: string, expiresAt: Date) =>
  sendStrictly(buildBookingVerificationEmail(input, token, expiresAt));
export const sendOwnerBookingEmail = async (booking: Booking, token?: string) => sendSafely(buildOwnerBookingEmail(booking, token));
export const sendOwnerMessageEmail = async (message: ContactMessage) => sendSafely(buildOwnerMessageEmail(message));
export const sendGuestConfirmationEmail = async (booking: Booking & { guestEmail: string }) =>
  sendStrictly(buildGuestConfirmationEmail(booking));
