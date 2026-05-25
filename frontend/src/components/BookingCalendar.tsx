type Props = {
  blockedDates: string[];
  checkIn: string;
  checkOut: string;
  onCheckInChange: (value: string) => void;
  onCheckOutChange: (value: string) => void;
};

export default function BookingCalendar({
  blockedDates,
  checkIn,
  checkOut,
  onCheckInChange,
  onCheckOutChange
}: Props) {
  return (
    <div className='grid gap-6 rounded-2xl bg-white p-6 shadow-sm md:grid-cols-2'>
      <label className='flex flex-col gap-2'>
        Check-in
        <input
          aria-label='Check-in'
          type='date'
          value={checkIn}
          onChange={(event) => onCheckInChange(event.target.value)}
          className='rounded border px-3 py-2'
        />
      </label>
      <label className='flex flex-col gap-2'>
        Check-out
        <input
          aria-label='Check-out'
          type='date'
          value={checkOut}
          onChange={(event) => onCheckOutChange(event.target.value)}
          className='rounded border px-3 py-2'
        />
      </label>
      <div className='md:col-span-2'>
        <p className='font-medium'>Blocked dates</p>
        <ul className='mt-2 flex flex-wrap gap-2'>
          {blockedDates.map((date) => (
            <li key={date} className='rounded bg-slate-200 px-3 py-1 text-sm'>
              {date}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
