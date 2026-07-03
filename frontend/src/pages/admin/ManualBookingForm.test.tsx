import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ManualBookingForm from './ManualBookingForm';
import * as adminApi from '../../api/admin';
import * as bookingsApi from '../../api/bookings';
import { CLEANING_FEE } from '../../types';

vi.spyOn(bookingsApi, 'getAvailability').mockResolvedValue({ blockedDates: [] });

afterEach(() => {
  vi.clearAllMocks();
});

const renderManualBookingForm = (props?: Partial<ComponentProps<typeof ManualBookingForm>>) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ManualBookingForm token='jwt-token' onCreated={vi.fn()} onCancel={vi.fn()} {...props} />
    </QueryClientProvider>
  );

describe('ManualBookingForm', () => {
  it('shows a validation error and does not submit when no dates are selected', async () => {
    const createSpy = vi.spyOn(adminApi, 'createManualBooking');

    renderManualBookingForm();

    fireEvent.change(screen.getByLabelText('Imię i nazwisko'), { target: { value: 'Jan Kowalski' } });
    fireEvent.change(screen.getByLabelText('Telefon'), { target: { value: '+48600000000' } });
    fireEvent.change(screen.getByLabelText('Cena za noc (PLN)'), { target: { value: '1000' } });
    fireEvent.click(screen.getByText('Zapisz rezerwację'));

    await waitFor(() => expect(screen.getByText('Wybierz zakres dat')).toBeInTheDocument());
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('submits the manual booking payload and calls onCreated on success', async () => {
    const createSpy = vi
      .spyOn(adminApi, 'createManualBooking')
      .mockResolvedValue({ id: 'b1', status: 'CONFIRMED', totalPrice: 2_200 + CLEANING_FEE });
    const onCreated = vi.fn();

    renderManualBookingForm({ onCreated });

    fireEvent.change(screen.getByLabelText('Imię i nazwisko'), { target: { value: 'Jan Kowalski' } });
    fireEvent.change(screen.getByLabelText('Telefon'), { target: { value: '+48600000000' } });
    fireEvent.change(screen.getByLabelText('Cena za noc (PLN)'), { target: { value: '1100' } });
    fireEvent.change(screen.getByLabelText('Check-in'), { target: { value: '2026-07-10' } });
    fireEvent.change(screen.getByLabelText('Check-out'), { target: { value: '2026-07-12' } });

    fireEvent.click(screen.getByText('Zapisz rezerwację'));

    await waitFor(() => expect(createSpy).toHaveBeenCalledWith('jwt-token', {
      guestName: 'Jan Kowalski',
      guestEmail: undefined,
      guestPhone: '+48600000000',
      checkIn: '2026-07-10',
      checkOut: '2026-07-12',
      guestsCount: 2,
      notes: undefined,
      pricePerNight: 1100,
      discountPercent: 0,
      depositAmount: 0
    }));
    expect(onCreated).toHaveBeenCalled();
  });
});
