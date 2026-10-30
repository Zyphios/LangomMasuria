import { isWithinInterval } from 'date-fns';
import { Prisma, type PricingSeason } from '@prisma/client';
import { BookingOperationError } from './bookingTransaction';

export const MIN_STAY_NIGHTS = 2;
// checkIn/checkOut are parsed as UTC midnight (e.g. new Date('2026-09-10') = 2026-09-10T00:00:00Z).
// Using date-fns local-time helpers (format/eachDayOfInterval/addDays) here would snap results to
// local midnight, which is a different instant in non-UTC timezones and breaks BlockedDate lookups
// and comparisons. Keep this arithmetic in UTC.
const toIsoDate = (value: Date) => value.toISOString().slice(0, 10);

export type Availability = { blockedDates: string[]; pendingDates: string[]; confirmedDates: string[]; manualBlockedDates: string[] };
export const activeBookings = (now: Date): Prisma.BookingWhereInput => ({
  OR: [{ status: 'CONFIRMED' }, { status: 'PENDING', expiresAt: { gt: now } }]
});
export const getAvailabilityForMonth = async (prisma: Prisma.TransactionClient, month: number, year: number, now: Date): Promise<Availability> => {
  const rangeStart = new Date(Date.UTC(year, month - 1, 1));
  const rangeEnd = new Date(Date.UTC(year, month, 1));

  const blockedDates = await prisma.blockedDate.findMany({
    where: { date: { gte: rangeStart, lt: rangeEnd } },
    orderBy: { date: 'asc' }
  });

  const bookings = await prisma.booking.findMany({
    where: { ...activeBookings(now), checkIn: { lt: rangeEnd }, checkOut: { gt: rangeStart } },
    select: { checkIn: true, checkOut: true, status: true },
    orderBy: { checkIn: 'asc' }
  });

  const datesFor = (status: 'PENDING' | 'CONFIRMED') => Array.from(new Set(bookings
    .filter((booking) => booking.status === status)
    .flatMap((booking) => getNightDates(booking.checkIn, booking.checkOut))
    .filter((date) => date >= rangeStart && date < rangeEnd).map(toIsoDate))).sort();
  const pendingDates = datesFor('PENDING');
  const confirmedDates = datesFor('CONFIRMED');
  const manualBlockedDates = blockedDates.map((entry) => toIsoDate(entry.date));
  return { pendingDates, confirmedDates, manualBlockedDates,
    blockedDates: Array.from(new Set([...manualBlockedDates, ...pendingDates, ...confirmedDates])).sort() };
};
export const getBlockedDatesForMonth = async (db: Prisma.TransactionClient, month: number, year: number) =>
  (await getAvailabilityForMonth(db, month, year, new Date())).blockedDates;

export const getNightCount = (checkIn: Date, checkOut: Date) => Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000);
export const getNightDates = (checkIn: Date, checkOut: Date) =>
  Array.from({ length: getNightCount(checkIn, checkOut) }, (_, index) => new Date(Date.UTC(checkIn.getUTCFullYear(), checkIn.getUTCMonth(), checkIn.getUTCDate() + index)));

export const assertMinimumStay = (checkIn: Date, checkOut: Date) => {
  const nights = getNightCount(checkIn, checkOut);
  if (nights < MIN_STAY_NIGHTS) throw new BookingOperationError(400, 'MINIMUM_STAY', 'Minimum stay is 2 nights');
  return nights;
};

export const isHolidaySeason = (season: Pick<PricingSeason, 'namePl'>) => season.namePl.includes('Święta');

export const pickSeasonForDate = (seasons: PricingSeason[], date: Date) => {
  const matching = seasons.filter((item) => isWithinInterval(date, { start: item.dateFrom, end: item.dateTo }));
  const season = matching.find(isHolidaySeason) ?? matching[0];
  if (!season) throw new BookingOperationError(400, 'NO_PRICING', `No pricing season found for ${toIsoDate(date)}`);
  return season;
};

export const assertDatesAvailable = async (prisma: Prisma.TransactionClient, checkIn: Date, checkOut: Date, options: { now?: Date; excludeBookingId?: string } = {}) => {
  if (!Number.isFinite(getNightCount(checkIn, checkOut)) || checkOut <= checkIn) throw new BookingOperationError(400, 'INVALID_DATES');
  const nightDates = getNightDates(checkIn, checkOut);
  const blocked = await prisma.blockedDate.findMany({ where: { date: { in: nightDates } } });
  if (blocked.length > 0) throw new BookingOperationError(409, 'DATES_UNAVAILABLE', 'Selected dates are not available');

  const conflictingBooking = await prisma.booking.findFirst({
    where: { ...activeBookings(options.now ?? new Date()), id: { not: options.excludeBookingId }, checkIn: { lt: checkOut }, checkOut: { gt: checkIn } }
  });
  if (conflictingBooking) throw new BookingOperationError(409, 'DATES_UNAVAILABLE', 'Selected dates are not available');
};

export const calculateTotalPrice = async (prisma: Prisma.TransactionClient, checkIn: Date, checkOut: Date) => {
  const seasons = await prisma.pricingSeason.findMany({ orderBy: { dateFrom: 'asc' } });
  return getNightDates(checkIn, checkOut).reduce((sum, date) => sum.plus(pickSeasonForDate(seasons, date).pricePerNight), new Prisma.Decimal(0));
};

export const calculateManualPrice = (pricePerNight: number, nights: number, discountPercent: number) => {
  const subtotal = pricePerNight * nights;
  const discounted = subtotal * (1 - discountPercent / 100);
  return new Prisma.Decimal(Math.round(discounted * 100) / 100);
};
