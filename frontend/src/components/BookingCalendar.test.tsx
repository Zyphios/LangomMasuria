import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BookingCalendar from './BookingCalendar';
import i18n from '../i18n';

beforeEach(async () => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2030-06-01T10:00:00Z')); await i18n.changeLanguage('pl'); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

it('allows checkout at the start of a pending stay without allowing checkin there', async () => {
  const user = userEvent.setup();
  const start = vi.fn();
  const end = vi.fn();
  const props = { blockedDates: ['2030-06-12'], pendingDates: ['2030-06-12'], checkIn: '', checkOut: '',
    onCheckInChange: start, onCheckOutChange: end };
  const view = render(<BookingCalendar {...props} />);
  expect(screen.getByRole('button', { name: /2030-06-12.*Wstępnie/ })).toBeDisabled();
  view.rerender(<BookingCalendar {...props} checkIn="2030-06-10" />);
  await user.click(screen.getByRole('button', { name: /2030-06-12.*Wstępnie/ }));
  expect(end).toHaveBeenCalledWith('2030-06-12');
  expect(start).not.toHaveBeenCalled();
});

it('does not allow a selected range across a blocked night', async () => {
  const user = userEvent.setup();
  const end = vi.fn();
  render(<BookingCalendar blockedDates={['2030-06-11']} checkIn="2030-06-10" checkOut=""
    onCheckInChange={vi.fn()} onCheckOutChange={end} />);
  await user.click(screen.getByRole('button', { name: /2030-06-14/ }));
  expect(end).not.toHaveBeenCalledWith('2030-06-14');
});

it('provides labeled categories and disables selection when availability is not known', () => {
  render(<BookingCalendar blockedDates={['2030-06-12']} pendingDates={['2030-06-12']} confirmedDates={['2030-06-15']}
    manualBlockedDates={['2030-06-18']} checkIn="" checkOut="" onCheckInChange={vi.fn()} onCheckOutChange={vi.fn()} disabled />);
  expect(screen.getByRole('button', { name: /2030-06-12.*Wstępnie/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: /2030-06-15.*Potwierdzony/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: /2030-06-18.*Blokada/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: /2030-06-20/ })).toBeDisabled();
});
