import { createHash, createHmac, randomBytes } from 'crypto';
import { BookingOperationError } from './bookingTransaction';

export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export const newBookingSecret = () => {
  const token = randomBytes(32).toString('hex');
  return { token, hash: createHash('sha256').update(token).digest('hex') };
};
export const hashBookingSecret = (token: string) => {
  if (!/^[a-f0-9]{64}$/.test(token)) throw new BookingOperationError(409, 'LINK_UNAVAILABLE');
  return createHash('sha256').update(token).digest('hex');
};

export function bookingConfig() {
  const url = new URL(process.env.PUBLIC_SITE_URL || '');
  const local = ['localhost', '127.0.0.1'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && local && url.protocol === 'http:')) ||
      url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Invalid PUBLIC_SITE_URL');
  const secret = process.env.BOOKING_ABUSE_SECRET || '';
  if (secret.length < 32) throw new Error('BOOKING_ABUSE_SECRET must contain at least 32 characters');
  const positive = (key: string, fallback: number) => {
    const text = process.env[key];
    const value = text === undefined ? fallback : Number(text);
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`Invalid ${key}`);
    return value;
  };
  return { baseUrl: url.origin, secret,
    pending: positive('BOOKING_PENDING_LIMIT', 1), daily: positive('BOOKING_DAILY_LIMIT', 3),
    emails: positive('BOOKING_EMAIL_DAILY_LIMIT', 5), cooldown: positive('BOOKING_EMAIL_COOLDOWN_SECONDS', 120),
    hourlyIp: positive('BOOKING_IP_HOURLY_LIMIT', 10), dailyIp: positive('BOOKING_IP_DAILY_LIMIT', 30),
    linkMinute: positive('BOOKING_LINK_MINUTE_LIMIT', 30) };
}

export function bookingLink(path: '/verify-booking' | '/booking-decision', token: string, decision?: 'CONFIRMED' | 'CANCELLED') {
  const fragment = new URLSearchParams({ token, ...(decision ? { decision } : {}) });
  return `${bookingConfig().baseUrl}${path}#${fragment}`;
}

export const hashBookingIp = (ip: string) =>
  createHmac('sha256', bookingConfig().secret).update(ip).digest('hex');
