type Props = {
  blockedDates: string[];
  checkIn: string;
  checkOut: string;
  onCheckInChange: (value: string) => void;
  onCheckOutChange: (value: string) => void;
};

const inputClasses = 'mt-2 w-full rounded-lg border border-outline bg-surface-container-lowest px-4 py-3 text-on-surface outline-none transition-colors focus:border-primary';

export default function BookingCalendar({
  blockedDates,
  checkIn,
  checkOut,
  onCheckInChange,
  onCheckOutChange
}: Props) {
  return (
    <div className='grid gap-6 rounded-[32px] border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-sm md:grid-cols-2 md:p-8'>
      <label className='flex flex-col gap-2 text-body-md text-on-surface'>
        Check-in
        <input
          aria-label='Check-in'
          type='date'
          value={checkIn}
          onChange={(event) => onCheckInChange(event.target.value)}
          className={inputClasses}
        />
      </label>
      <label className='flex flex-col gap-2 text-body-md text-on-surface'>
        Check-out
        <input
          aria-label='Check-out'
          type='date'
          value={checkOut}
          onChange={(event) => onCheckOutChange(event.target.value)}
          className={inputClasses}
        />
      </label>
      <div className='md:col-span-2'>
        <p className='text-label-caps uppercase text-on-surface-variant'>Blocked dates</p>
        <ul className='mt-3 flex flex-wrap gap-2'>
          {blockedDates.length > 0 ? blockedDates.map((date) => (
            <li key={date} className='rounded-full bg-surface-container px-3 py-1 text-sm text-on-surface-variant'>
              {date}
            </li>
          )) : (
            <li className='text-body-md text-on-surface-variant'>No blocked dates in the selected month.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
