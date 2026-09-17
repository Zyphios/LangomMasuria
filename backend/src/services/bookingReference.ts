import { format } from 'date-fns';

// Human-friendly booking reference, e.g. LM-20260915-JAN4K7T
// - date part makes it easy to sort/scan chronologically
// - email-derived prefix gives a quick visual hint of who it belongs to
// - random suffix guarantees practical uniqueness without needing a sequence/counter
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I characters

const randomSuffix = (length: number) =>
  Array.from({ length }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');

export const generateBookingReference = (email: string | undefined, now: Date = new Date()) => {
  const emailPrefix = ((email || '').split('@')[0] || 'GOSC')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .padEnd(3, 'X')
    .slice(0, 3);
  const datePart = format(now, 'yyyyMMdd');
  return `LM-${datePart}-${emailPrefix}${randomSuffix(4)}`;
};
