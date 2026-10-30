import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import * as api from '../api/bookings';
import { ApiError } from '../api/client';
import i18n from '../i18n';
import BookingLink from './BookingLink';

const token = 'a'.repeat(64);
const preview = { checkIn: '2030-06-10', checkOut: '2030-06-12', guestsCount: 2, totalPrice: '1000', expiresAt: '2030-06-02T10:00:00Z' };
const mount = (kind: 'verification' | 'decision' = 'verification') => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter><BookingLink kind={kind} /></MemoryRouter>
  </QueryClientProvider>
);
beforeEach(async () => {
  await i18n.changeLanguage('pl');
  window.history.replaceState({}, '', `/verify-booking#token=${token}&decision=CONFIRMED`);
  vi.spyOn(api, 'previewBookingLink').mockResolvedValue(preview);
  vi.spyOn(api, 'completeBookingLink').mockResolvedValue({ id: 'b1', reference: 'TEST', status: 'PENDING', totalPrice: 1000, expiresAt: '2030-06-03T10:00:00Z' });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('does not act when opened; explicit confirmation creates the pending hold', async () => {
  const user = userEvent.setup();
  mount();
  await screen.findByText(/1000 PLN/);
  expect(api.completeBookingLink).not.toHaveBeenCalled();
  expect(window.location.hash).toBe('');
  expect(Object.values(localStorage)).not.toContain(token);
  await user.click(screen.getByRole('button', { name: 'Potwierdzam zgłoszenie' }));
  expect(await screen.findByText(/24 godziny/)).toBeInTheDocument();
  expect(api.completeBookingLink).toHaveBeenCalledWith('verification', token, '1000', 'CONFIRMED');
});

it('requires a new click after the price changed instead of auto-confirming', async () => {
  const user = userEvent.setup();
  vi.mocked(api.completeBookingLink).mockRejectedValueOnce(new ApiError('PRICE_CHANGED', 409));
  mount();
  await screen.findByText(/1000 PLN/);
  await user.click(screen.getByRole('button', { name: 'Potwierdzam zgłoszenie' }));
  await waitFor(() => expect(api.previewBookingLink).toHaveBeenCalledTimes(2));
  expect(api.completeBookingLink).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Potwierdzam zgłoszenie' })).toBeEnabled();
});

it('shows invalid links without sending any request', async () => {
  window.history.replaceState({}, '', '/verify-booking');
  mount();
  expect(await screen.findByRole('alert')).toHaveTextContent(/link/i);
  expect(api.previewBookingLink).not.toHaveBeenCalled();
  expect(api.completeBookingLink).not.toHaveBeenCalled();
});

it('rejects an owner link without an explicit valid decision instead of defaulting to acceptance', async () => {
  window.history.replaceState({}, '', `/booking-decision#token=${token}&decision=unexpected`);
  mount('decision');
  expect(await screen.findByRole('alert')).toHaveTextContent(/link/i);
  expect(api.previewBookingLink).not.toHaveBeenCalled();
  expect(api.completeBookingLink).not.toHaveBeenCalled();
});

it('explains dates sold out between submission and verification without blaming the email link', async () => {
  vi.mocked(api.previewBookingLink).mockRejectedValueOnce(new ApiError('Selected dates are not available', 409, 'DATES_UNAVAILABLE'));
  mount();
  expect(await screen.findByRole('alert')).toHaveTextContent(/Termin jest już niedostępny/);
  expect(screen.queryByRole('button', { name: 'Potwierdzam zgłoszenie' })).not.toBeInTheDocument();
});
