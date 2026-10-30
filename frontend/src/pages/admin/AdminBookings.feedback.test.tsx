import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminBookings from './AdminBookings';
import * as adminApi from '../../api/admin';
import i18n from '../../i18n';
import type { AdminBookingRow } from '../../types';

const rows: AdminBookingRow[] = [
  {
    id: 'feedback-1', reference: 'TEST-1', guestName: 'Anna', guestEmail: null, guestPhone: '000',
    status: 'CONFIRMED', source: 'WEBSITE', checkIn: '2026-10-16T00:00:00.000Z',
    checkOut: '2026-10-18T00:00:00.000Z', totalPrice: '1000', depositAmount: '0', expiresAt: null,
    originalTotalPrice: null, discountPercent: null,
    confirmation: { status: 'NOT_APPLICABLE', attempts: 0, sentAt: null, lastError: null }
  },
  {
    id: 'feedback-2', reference: 'TEST-2', guestName: 'Jan', guestEmail: null, guestPhone: '000',
    status: 'CONFIRMED', source: 'MANUAL', checkIn: '2026-11-01', checkOut: '2026-11-03',
    totalPrice: '1000', depositAmount: '500', expiresAt: null,
    originalTotalPrice: null, discountPercent: null,
    confirmation: { status: 'NOT_APPLICABLE', attempts: 0, sentAt: null, lastError: null }
  }
];

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

async function showBookings() {
  const view = render(<QueryClientProvider client={new QueryClient()}><AdminBookings /></QueryClientProvider>);
  await screen.findByText('Anna');
  return view;
}

function editDeposit(value = '200') {
  const input = screen.getByLabelText('Zaliczka Anna');
  fireEvent.change(input, { target: { value } });
  return within(input.parentElement!).getByRole('button', { name: 'Zapisz zaliczkę' });
}

beforeEach(async () => {
  localStorage.setItem('adminToken', 'synthetic-admin-token');
  await i18n.changeLanguage('pl');
  vi.spyOn(adminApi, 'getAdminBookings').mockResolvedValue(rows);
  vi.spyOn(adminApi, 'updateBookingDeposit').mockResolvedValue({ depositAmount: '200' });
});

afterEach(async () => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.clear();
  await i18n.changeLanguage('pl');
});

describe('admin deposit feedback', () => {
  it.each([
    ['PENDING', 'Powiadomienie o rezerwacji wstępnej', 'Provisional booking notification'],
    ['CONFIRMED', 'Potwierdzenie rezerwacji', 'Booking confirmation'],
    ['CANCELLED', 'Powiadomienie o odrzuceniu / anulowaniu', 'Rejection / cancellation notification']
  ] as const)('labels and retries failed %s notifications in both languages', async (kind, polish, english) => {
    vi.mocked(adminApi.getAdminBookings).mockResolvedValue([{
      ...rows[0], guestEmail: 'anna@example.com', status: kind,
      confirmation: { kind, status: 'FAILED', attempts: 3, sentAt: null, lastError: 'DELIVERY_UNKNOWN' }
    }]);
    const retry = vi.spyOn(adminApi, 'retryBookingConfirmation').mockResolvedValue(undefined);
    await showBookings();
    expect(screen.getByText(`${polish}: Błąd wysyłki`)).toBeInTheDocument();
    expect(screen.getByText(/Ponowienie może wysłać duplikat/)).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Ponów wysyłkę' })); });
    expect(retry).toHaveBeenCalledWith('synthetic-admin-token', 'feedback-1');
    await act(async () => { await i18n.changeLanguage('en'); });
    expect(screen.getByText(`${english}: Email delivery failed`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry email' })).toBeInTheDocument();
  });

  it.each([
    ['QUEUED', 'Wiadomość oczekuje na wysyłkę'],
    ['SENDING', 'Wysyłanie wiadomości'],
    ['SENT', 'Przekazano do serwera poczty'],
    ['CANCELLED', 'Wysyłka anulowana']
  ] as const)('distinguishes rejection notification kind from delivery state %s', async (status, label) => {
    vi.mocked(adminApi.getAdminBookings).mockResolvedValue([{
      ...rows[0], status: 'CANCELLED',
      confirmation: { kind: 'CANCELLED', status, attempts: 1, sentAt: null, lastError: null }
    }]);
    await showBookings();
    expect(screen.getByText(`Powiadomienie o odrzuceniu / anulowaniu: ${label}`)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ponów wysyłkę' })).not.toBeInTheDocument();
  });

  it('defaults historical notifications without kind to confirmation', async () => {
    vi.mocked(adminApi.getAdminBookings).mockResolvedValue([{
      ...rows[0], confirmation: { status: 'SENT', attempts: 1, sentAt: '2030-01-01', lastError: null }
    }]);
    await showBookings();
    expect(screen.getByText('Potwierdzenie rezerwacji: Przekazano do serwera poczty')).toBeInTheDocument();
  });

  it('does not offer a save when the amount is unchanged', async () => {
    await showBookings();
    expect(screen.getAllByRole('button', { name: 'Zapisz zaliczkę' }).every((button) => button.hasAttribute('disabled'))).toBe(true);
    editDeposit('0.00');
    expect(within(screen.getByLabelText('Zaliczka Anna').parentElement!).getByRole('button')).toBeDisabled();
  });

  it('waits for the server before acknowledging and prevents duplicate saves', async () => {
    const pending = deferred<{ depositAmount: string }>();
    vi.mocked(adminApi.updateBookingDeposit).mockReturnValueOnce(pending.promise);
    await showBookings();
    const button = editDeposit();
    fireEvent.click(button);
    expect(screen.getByRole('button', { name: 'Zapisuję…' })).toBeDisabled();
    expect(screen.getByLabelText('Zaliczka Anna')).toBeDisabled();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    fireEvent.click(button);
    expect(adminApi.updateBookingDeposit).toHaveBeenCalledTimes(1);
    expect(adminApi.updateBookingDeposit).toHaveBeenCalledWith('synthetic-admin-token', 'feedback-1', 200);
    await act(async () => { pending.resolve({ depositAmount: '200.00' }); });
    expect(screen.getByRole('status')).toHaveTextContent('Zapisano');
    expect(screen.getByLabelText('Zaliczka Anna')).toHaveValue('200.00');
    expect(screen.getByLabelText('Zaliczka Anna')).not.toBeDisabled();
  });

  it('keeps acknowledgement visible for exactly three seconds', async () => {
    await showBookings();
    vi.useFakeTimers();
    await act(async () => { fireEvent.click(editDeposit()); });
    expect(screen.getByRole('status')).toHaveTextContent('Zapisano');
    act(() => { vi.advanceTimersByTime(2999); });
    expect(screen.getByRole('status')).toHaveTextContent('Zapisano');
    act(() => { vi.advanceTimersByTime(1); });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('clears feedback on editing without an older timer clearing the next save', async () => {
    vi.mocked(adminApi.updateBookingDeposit).mockResolvedValueOnce({ depositAmount: '200' })
      .mockResolvedValueOnce({ depositAmount: '300' });
    await showBookings();
    vi.useFakeTimers();
    await act(async () => { fireEvent.click(editDeposit()); });
    act(() => { vi.advanceTimersByTime(1000); });
    const nextSave = editDeposit('300');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    await act(async () => { fireEvent.click(nextSave); });
    act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.getByRole('status')).toHaveTextContent('Zapisano');
    act(() => { vi.advanceTimersByTime(999); });
    expect(screen.getByRole('status')).toHaveTextContent('Zapisano');
    act(() => { vi.advanceTimersByTime(1); });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('retains the draft and allows retry after a rejected save', async () => {
    vi.mocked(adminApi.updateBookingDeposit).mockRejectedValueOnce(new Error('synthetic failure'));
    await showBookings();
    fireEvent.click(editDeposit());
    expect(await screen.findByRole('alert')).toHaveTextContent('Nie udało się zapisać zaliczki');
    expect(screen.getByLabelText('Zaliczka Anna')).toHaveValue('200');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    fireEvent.click(within(screen.getByLabelText('Zaliczka Anna').parentElement!).getByRole('button'));
    expect(await screen.findByRole('status')).toHaveTextContent('Zapisano');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each(['-1', 'abc'])('does not send an invalid amount %s', async (value) => {
    await showBookings();
    fireEvent.click(editDeposit(value));
    expect(await screen.findByRole('alert')).toHaveTextContent('Zaliczka musi być liczbą nieujemną');
    expect(adminApi.updateBookingDeposit).not.toHaveBeenCalled();
  });

  it('allows another row to save while one row is waiting', async () => {
    const pending = deferred<{ depositAmount: string }>();
    vi.mocked(adminApi.updateBookingDeposit).mockReturnValueOnce(pending.promise).mockResolvedValueOnce({ depositAmount: '600' });
    await showBookings();
    fireEvent.click(editDeposit());
    const other = screen.getByLabelText('Zaliczka Jan');
    fireEvent.change(other, { target: { value: '600' } });
    fireEvent.click(within(other.parentElement!).getByRole('button'));
    expect(await within(other.parentElement!).findByRole('status')).toHaveTextContent('Zapisano');
    expect(other).toHaveValue('600');
    expect(screen.getByRole('button', { name: 'Zapisuję…' })).toBeDisabled();
    await act(async () => { pending.resolve({ depositAmount: '200' }); });
  });

  it('preserves save feedback when the booking list refreshes on focus', async () => {
    await showBookings();
    fireEvent.click(editDeposit());
    await screen.findByRole('status');
    vi.mocked(adminApi.getAdminBookings).mockResolvedValue(rows.map((row) =>
      row.id === 'feedback-1' ? { ...row, depositAmount: '200' } : row));
    await act(async () => { window.dispatchEvent(new Event('focus')); });
    expect(screen.getByRole('status')).toHaveTextContent('Zapisano');
    expect(screen.getByLabelText('Zaliczka Anna')).toHaveValue('200');
  });

  it('cleans up acknowledgement timers on unmount', async () => {
    const view = await showBookings();
    vi.useFakeTimers();
    await act(async () => { fireEvent.click(editDeposit()); });
    expect(screen.getByRole('status')).toHaveTextContent('Zapisano');
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not create an acknowledgement timer for a response after unmount', async () => {
    const pending = deferred<{ depositAmount: string }>();
    vi.mocked(adminApi.updateBookingDeposit).mockReturnValueOnce(pending.promise);
    const view = await showBookings();
    vi.useFakeTimers();
    fireEvent.click(editDeposit());
    view.unmount();
    await act(async () => { pending.resolve({ depositAmount: '200' }); });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('shows date-only stay ranges for timestamps and date strings', async () => {
    await showBookings();
    expect(screen.getByText('2026-10-16 – 2026-10-18')).toBeInTheDocument();
    expect(screen.getByText('2026-11-01 – 2026-11-03')).toBeInTheDocument();
    expect(screen.queryByText(/2026-10-16T/)).not.toBeInTheDocument();
  });

  it('keeps the time in the decision deadline', async () => {
    vi.mocked(adminApi.getAdminBookings).mockResolvedValueOnce([
      { ...rows[0], status: 'PENDING', expiresAt: '2030-06-02T10:30:00Z' }
    ]);
    await showBookings();
    expect(screen.getByText(/Decyzja do:.*\d{1,2}:\d{2}/)).toBeInTheDocument();
  });

  it('translates saving, acknowledgement and errors into English', async () => {
    const pending = deferred<{ depositAmount: string }>();
    vi.mocked(adminApi.updateBookingDeposit).mockReturnValueOnce(pending.promise)
      .mockRejectedValueOnce(new Error('synthetic failure'));
    await i18n.changeLanguage('en');
    await showBookings();
    const input = screen.getByLabelText('Deposit Anna');
    fireEvent.change(input, { target: { value: '200' } });
    fireEvent.click(within(input.parentElement!).getByRole('button', { name: 'Save deposit' }));
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    await act(async () => { pending.resolve({ depositAmount: '200' }); });
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
    fireEvent.change(input, { target: { value: '300' } });
    fireEvent.click(within(input.parentElement!).getByRole('button', { name: 'Save deposit' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save the deposit');
  });
});
