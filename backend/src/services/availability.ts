import { differenceInCalendarDays, endOfMonth, isWithinInterval, startOfMonth } from 'date-fns';
import { BookingStatus, Prisma, PrismaClient, type PricingSeason } from '@prisma/client';

export const CLEANING_FEE = 200;
export const MIN_STAY_NIGHTS = 2;
// checkIn/checkOut are parsed as UTC midnight (e.g. new Date('2026-09-10') = 2026-09-10T00:00:00Z).
// Using date-fns local-time helpers (format/eachDayOfInterval/addDays) here would snap results to
// local midnight, which is a different instant in non-UTC timezones and breaks BlockedDate lookups
// and comparisons. Keep this arithmetic in UTC.
const toIsoDate = (value: Date) => value.toISOString().slice(0, 10);

export const getBlockedDatesForMonth = async (prisma: PrismaClient, month: number, year: number) => {
  const rangeStart = startOfMonth(new Date(year, month - 1, 1));
  const rangeEnd = endOfMonth(rangeStart);

  const blockedDates = await prisma.blockedDate.findMany({
    where: { date: { gte: rangeStart, lte: rangeEnd } },
    orderBy: { date: 'asc' }
  });

  const confirmedBookings = await prisma.booking.findMany({
    where: { status: BookingStatus.CONFIRMED, checkIn: { lte: rangeEnd }, checkOut: { gte: rangeStart } },
    orderBy: { checkIn: 'asc' }
  });

  const bookingDates = confirmedBookings.flatMap((booking) => getNightDates(booking.checkIn, booking.checkOut).map(toIsoDate));

  return Array.from(new Set([...blockedDates.map((entry) => toIsoDate(entry.date)), ...bookingDates])).sort();
};

export const getNightCount = (checkIn: Date, checkOut: Date) => differenceInCalendarDays(checkOut, checkIn);
export const getNightDates = (checkIn: Date, checkOut: Date) =>
  Array.from({ length: getNightCount(checkIn, checkOut) }, (_, index) => new Date(Date.UTC(checkIn.getUTCFullYear(), checkIn.getUTCMonth(), checkIn.getUTCDate() + index)));

export const assertMinimumStay = (checkIn: Date, checkOut: Date) => {
  const nights = getNightCount(checkIn, checkOut);
  if (nights < MIN_STAY_NIGHTS) throw new Error('Minimum stay is 2 nights');
  return nights;
};

export const pickSeasonForDate = (seasons: PricingSeason[], date: Date) => {
  const season = seasons.find((item) => isWithinInterval(date, { start: item.dateFrom, end: item.dateTo }));
  if (!season) throw new Error(`No pricing season found for ${toIsoDate(date)}`);
  return season;
};

export const assertDatesAvailable = async (prisma: PrismaClient, checkIn: Date, checkOut: Date) => {
  const nightDates = getNightDates(checkIn, checkOut);
  const blocked = await prisma.blockedDate.findMany({ where: { date: { in: nightDates } } });
  if (blocked.length > 0) throw new Error('Selected dates are not available');

  const conflictingBooking = await prisma.booking.findFirst({
    where: { status: BookingStatus.CONFIRMED, checkIn: { lt: checkOut }, checkOut: { gt: checkIn } }
  });
  if (conflictingBooking) throw new Error('Selected dates are not available');
};

export const calculateTotalPrice = async (prisma: PrismaClient, checkIn: Date, checkOut: Date) => {
  const seasons = await prisma.pricingSeason.findMany({ orderBy: { dateFrom: 'asc' } });
  const subtotal = getNightDates(checkIn, checkOut).reduce((sum, date) => sum + pickSeasonForDate(seasons, date).pricePerNight.toNumber(), 0);
  return new Prisma.Decimal(subtotal + CLEANING_FEE);
};

export const blockDatesForBooking = async (prisma: PrismaClient, booking: { checkIn: Date; checkOut: Date }, reason = 'Confirmed booking') => {
  for (const date of getNightDates(booking.checkIn, booking.checkOut)) {
    await prisma.blockedDate.upsert({ where: { date }, update: { reason }, create: { date, reason } });
  }
};

export const calculateManualPrice = (pricePerNight: number, nights: number, discountPercent: number) => {
  const subtotal = pricePerNight * nights;
  const discounted = subtotal * (1 - discountPercent / 100);
  return new Prisma.Decimal(Math.round((discounted + CLEANING_FEE) * 100) / 100);
};
