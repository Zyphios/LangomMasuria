import { addDays, differenceInCalendarDays, eachDayOfInterval, endOfMonth, format, isWithinInterval, startOfMonth } from 'date-fns';
import { BookingStatus, Prisma, PrismaClient, type PricingSeason } from '@prisma/client';

export const CLEANING_FEE = 200;
export const MIN_STAY_NIGHTS = 2;
const toIsoDate = (value: Date) => format(value, 'yyyy-MM-dd');

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

  const bookingDates = confirmedBookings.flatMap((booking) =>
    eachDayOfInterval({ start: booking.checkIn, end: addDays(booking.checkOut, -1) }).map(toIsoDate)
  );

  return Array.from(new Set([...blockedDates.map((entry) => toIsoDate(entry.date)), ...bookingDates])).sort();
};

export const getNightCount = (checkIn: Date, checkOut: Date) => differenceInCalendarDays(checkOut, checkIn);
export const getNightDates = (checkIn: Date, checkOut: Date) => eachDayOfInterval({ start: checkIn, end: addDays(checkOut, -1) });

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
