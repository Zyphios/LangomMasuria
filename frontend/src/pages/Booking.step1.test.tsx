import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Booking from './Booking';
import * as bookingsApi from '../api/bookings';
import { vi } from 'vitest';

vi.spyOn(bookingsApi, 'getAvailability').mockResolvedValue({ blockedDates: ['2026-06-10'] });

describe('booking step 1', () => {
  it('prevents selecting a stay shorter than two nights', async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <Booking />
      </QueryClientProvider>
    );
    
    await user.type(screen.getByLabelText('Check-in'), '2026-06-12');
    await user.type(screen.getByLabelText('Check-out'), '2026-06-13');
    await user.click(screen.getByRole('button', { name: 'Dalej' }));
    
    expect(await screen.findByText('Minimum stay is 2 nights')).toBeInTheDocument();
  });
});
