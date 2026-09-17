import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Booking from './Booking';
import * as contactApi from '../api/contact';
import * as bookingsApi from '../api/bookings';
import * as pricingApi from '../api/pricing';
import { vi } from 'vitest';

vi.spyOn(bookingsApi, 'getAvailability').mockResolvedValue({ blockedDates: [] });
vi.spyOn(pricingApi, 'getPricingSeasons').mockResolvedValue([]);
vi.spyOn(contactApi, 'sendContactMessage').mockResolvedValue({ success: true });

describe('contact section', () => {
  it('submits the embedded contact form', async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <Booking />
      </QueryClientProvider>
    );
    
    await user.type(screen.getByLabelText('KONTAKT — IMIĘ'), 'Maria');
    await user.type(screen.getByLabelText('KONTAKT — EMAIL'), 'maria@example.com');
    await user.type(screen.getByLabelText('KONTAKT — WIADOMOŚĆ'), 'Czy akceptujecie psy?');
    await user.click(screen.getByRole('button', { name: 'Wyślij wiadomość' }));
    
    expect(await screen.findByText('Wiadomość została wysłana.')).toBeInTheDocument();
  });
});
