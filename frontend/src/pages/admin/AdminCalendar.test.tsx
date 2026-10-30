import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminCalendar from './AdminCalendar';
import * as adminApi from '../../api/admin';
import * as bookingsApi from '../../api/bookings';
import i18n from '../../i18n';

it('shows categorized dates and explicit owner blocks rather than only a date input', async () => {
  await i18n.changeLanguage('pl');
  vi.spyOn(bookingsApi, 'getAvailability').mockResolvedValue({
    blockedDates: [], pendingDates: [], confirmedDates: [], manualBlockedDates: []
  });
  vi.spyOn(adminApi, 'getAdminBlockedDates').mockResolvedValue([{ id: 'm1', date: '2030-06-10', reason: 'Prace' }]);
  render(<QueryClientProvider client={new QueryClient()}><AdminCalendar /></QueryClientProvider>);
  expect(await screen.findByText(/Prace/)).toBeInTheDocument();
  expect(screen.getByLabelText('Legenda kalendarza')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Usuń blokadę/ })).toBeInTheDocument();
});
