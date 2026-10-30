import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ManualBookingForm from './ManualBookingForm';
import * as adminApi from '../../api/admin';
import * as bookingsApi from '../../api/bookings';

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
    await waitFor(() => expect(screen.getByText('Zapisz rezerwację')).toBeEnabled());
    fireEvent.click(screen.getByText('Zapisz rezerwację'));

    await waitFor(() => expect(screen.getByText('Wybierz zakres dat')).toBeInTheDocument());
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('submits the manual booking payload and calls onCreated on success', async () => {
    const createSpy = vi
      .spyOn(adminApi, 'createManualBooking')
      .mockResolvedValue({ id: 'b1', status: 'CONFIRMED', totalPrice: 2_200 });
    const onCreated = vi.fn();

    renderManualBookingForm({ onCreated });

    fireEvent.change(screen.getByLabelText('Imię i nazwisko'), { target: { value: 'Jan Kowalski' } });
    fireEvent.change(screen.getByLabelText('Telefon'), { target: { value: '+48600000000' } });
    fireEvent.change(screen.getByLabelText('Cena za noc (PLN)'), { target: { value: '1100' } });

    await waitFor(() => expect(screen.getByText('Zapisz rezerwację')).toBeEnabled());
    const next = new Date();
    next.setMonth(next.getMonth() + 1, 1);
    const month = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`${month}-05 —`) }));
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`${month}-08 —`) }));

    fireEvent.click(screen.getByText('Zapisz rezerwację'));

    await waitFor(() => expect(createSpy).toHaveBeenCalled());
    const payload = createSpy.mock.calls[0][1];
    expect(payload).toMatchObject({
      guestName: 'Jan Kowalski',
      guestEmail: undefined,
      guestPhone: '+48600000000',
      guestsCount: 2,
      notes: undefined,
      pricePerNight: 1100,
      discountPercent: 0,
      depositAmount: 0
    });
    expect(payload.checkIn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(payload.checkOut).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(payload.checkOut > payload.checkIn).toBe(true);
    expect(onCreated).toHaveBeenCalled();
  });
});
