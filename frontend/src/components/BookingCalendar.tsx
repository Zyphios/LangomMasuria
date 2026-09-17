import { useEffect, useState } from 'react';
import {
  addMonths,
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isWithinInterval,
  isBefore,
  isAfter,
  parseISO
} from 'date-fns';
import { pl, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

type VisibleMonth = { month: number; year: number };

type Props = {
  blockedDates: string[];
  checkIn: string;
  checkOut: string;
  onCheckInChange: (value: string) => void;
  onCheckOutChange: (value: string) => void;
  // Optional: notifies the parent which two months are currently displayed
  // (fires on mount and whenever the admin navigates via the arrows), so the
  // parent can fetch/merge blockedDates for BOTH visible months instead of
  // just one. Kept optional so existing callers (e.g. guest Booking.tsx)
  // remain unaffected.
  onVisibleMonthsChange?: (months: { left: VisibleMonth; right: VisibleMonth }) => void;
};

const DAY_LABEL_KEYS = ['calendar.days.mon', 'calendar.days.tue', 'calendar.days.wed', 'calendar.days.thu', 'calendar.days.fri', 'calendar.days.sat', 'calendar.days.sun'];

function getCalendarDays(month: Date) {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
}

export default function BookingCalendar({
  blockedDates,
  checkIn,
  checkOut,
  onCheckInChange,
  onCheckOutChange,
  onVisibleMonthsChange
}: Props) {
  const { t, i18n } = useTranslation();
  const dateFnsLocale = i18n.language === 'en' ? enUS : pl;
  const [leftMonth, setLeftMonth] = useState(() => startOfMonth(new Date()));
  const rightMonth = addMonths(leftMonth, 1);

  useEffect(() => {
    onVisibleMonthsChange?.({
      left: { month: leftMonth.getMonth() + 1, year: leftMonth.getFullYear() },
      right: { month: rightMonth.getMonth() + 1, year: rightMonth.getFullYear() }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leftMonth]);

  const blockedSet = new Set(blockedDates);
  const checkInDate = checkIn ? parseISO(checkIn) : null;
  const checkOutDate = checkOut ? parseISO(checkOut) : null;
  const today = startOfMonth(new Date());

  const handleDayClick = (day: Date) => {
    const iso = format(day, 'yyyy-MM-dd');
    if (blockedSet.has(iso)) return;

    if (!checkIn || (checkIn && checkOut)) {
      onCheckInChange(iso);
      onCheckOutChange('');
    } else {
      if (isBefore(day, parseISO(checkIn))) {
        onCheckInChange(iso);
        onCheckOutChange('');
      } else {
        // Guard against selecting a check-out beyond an already-booked stretch: the nights of the
        // candidate range are checkIn..checkOut-1 (the check-out day itself is not slept in), so a
        // blocked date anywhere strictly inside that span means the range encloses an unavailable
        // night and must be rejected. Instead of forcing the guest to first deselect, treat the
        // clicked date as the start of a brand new selection (matching how picking a date before
        // the current check-in already restarts the selection above).
        const candidateNights = eachDayOfInterval({ start: parseISO(checkIn), end: day }).slice(0, -1);
        const spansBlockedNight = candidateNights.some((night) => blockedSet.has(format(night, 'yyyy-MM-dd')));
        if (spansBlockedNight) {
          onCheckInChange(iso);
          onCheckOutChange('');
          return;
        }
        onCheckOutChange(iso);
      }
    }
  };

  const getDayClasses = (day: Date, month: Date) => {
    const iso = format(day, 'yyyy-MM-dd');
    const isCurrentMonth = isSameMonth(day, month);
    const isBlocked = blockedSet.has(iso);
    const isCheckIn = checkInDate && isSameDay(day, checkInDate);
    const isCheckOut = checkOutDate && isSameDay(day, checkOutDate);
    const inRange =
      checkInDate &&
      checkOutDate &&
      isWithinInterval(day, { start: checkInDate, end: checkOutDate });

    if (!isCurrentMonth) return 'invisible pointer-events-none';

    let cls = 'relative w-9 h-9 rounded-full flex items-center justify-center text-sm cursor-pointer transition-colors select-none ';

    if (isBlocked) {
      cls += 'bg-primary/20 text-primary font-medium cursor-not-allowed';
    } else if (isCheckIn || isCheckOut) {
      cls += 'bg-primary text-on-primary font-semibold';
    } else if (inRange) {
      cls += 'bg-primary/15 text-on-surface rounded-none';
    } else {
      cls += 'text-on-surface hover:bg-surface-container';
    }

    return cls;
  };

  const renderMonth = (month: Date) => {
    const days = getCalendarDays(month);
    return (
      <div className='min-w-0'>
        <p className='mb-4 text-center text-body-lg font-medium text-on-surface capitalize'>
          {format(month, 'LLLL yyyy', { locale: dateFnsLocale })}
        </p>
        <div className='grid grid-cols-7 gap-y-1'>
          {DAY_LABEL_KEYS.map((key) => (
            <div key={key} className='flex h-8 items-center justify-center text-label-caps text-on-surface-variant'>
              {t(key)}
            </div>
          ))}
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className='flex items-center justify-center'
              onClick={() => isSameMonth(day, month) && handleDayClick(day)}
            >
              <span className={getDayClasses(day, month)}>
                {isSameMonth(day, month) ? format(day, 'd') : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className='rounded-[32px] border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-sm md:p-8'>
      <div className='flex items-center justify-between mb-6'>
        <button
          type='button'
          aria-label={t('calendar.prevMonth')}
          onClick={() => setLeftMonth((m) => addMonths(m, -1))}
          disabled={!isBefore(addMonths(leftMonth, -1), today) && isSameDay(leftMonth, today)}
          className='flex h-9 w-9 items-center justify-center rounded-full border border-outline text-on-surface transition-colors hover:bg-surface-container disabled:opacity-40'
        >
          <span className='material-symbols-outlined' style={{ fontSize: 20 }}>chevron_left</span>
        </button>
        <button
          type='button'
          aria-label={t('calendar.nextMonth')}
          onClick={() => setLeftMonth((m) => addMonths(m, 1))}
          className='flex h-9 w-9 items-center justify-center rounded-full border border-outline text-on-surface transition-colors hover:bg-surface-container'
        >
          <span className='material-symbols-outlined' style={{ fontSize: 20 }}>chevron_right</span>
        </button>
      </div>
      <div className='grid gap-8 md:grid-cols-2'>
        {renderMonth(leftMonth)}
        {renderMonth(rightMonth)}
      </div>
      {(checkIn || checkOut) && (
        <div className='mt-6 flex flex-wrap gap-4 text-body-md text-on-surface-variant border-t border-outline-variant/30 pt-5'>
          <span>
            <span className='font-medium text-on-surface'>{t('calendar.checkIn')}:</span>{' '}
            {checkIn ? format(parseISO(checkIn), 'd MMMM yyyy', { locale: dateFnsLocale }) : '—'}
          </span>
          <span>
            <span className='font-medium text-on-surface'>{t('calendar.checkOut')}:</span>{' '}
            {checkOut ? format(parseISO(checkOut), 'd MMMM yyyy', { locale: dateFnsLocale }) : '—'}
          </span>
        </div>
      )}
    </div>
  );
}
