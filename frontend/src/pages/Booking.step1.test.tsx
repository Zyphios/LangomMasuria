import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Booking from './Booking';
import * as bookingsApi from '../api/bookings';
import * as pricingApi from '../api/pricing';
import { vi } from 'vitest';

vi.spyOn(bookingsApi, 'getAvailability').mockResolvedValue({ blockedDates: ['2026-06-10'] });
vi.spyOn(pricingApi, 'getPricingSeasons').mockResolvedValue([]);

describe('booking step 1', () => {
  it('prevents selecting a stay shorter than two nights', async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <Booking />
      </QueryClientProvider>
    );
    
    const next = new Date();
    next.setMonth(next.getMonth() + 1, 1);
    const month = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
    await user.click(await screen.findByRole('button', { name: new RegExp(`${month}-12 —`) }));
    await user.click(screen.getByRole('button', { name: new RegExp(`${month}-13 —`) }));
    await user.click(screen.getByRole('button', { name: 'Dalej' }));
    
    expect(await screen.findByText('Minimalna długość pobytu to 2 noce')).toBeInTheDocument();
  });
});
