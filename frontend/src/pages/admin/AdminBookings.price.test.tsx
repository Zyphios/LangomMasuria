import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminBookings from './AdminBookings';
import * as adminApi from '../../api/admin';
import i18n from '../../i18n';

const booking = {
  id: 'pending-price', reference: 'PENDING-PRICE', guestName: 'Anna', guestEmail: 'test@example.invalid',
  guestPhone: '000', status: 'PENDING' as const, source: 'WEBSITE' as const,
  checkIn: '2040-06-10', checkOut: '2040-06-12', totalPrice: '3000', originalTotalPrice: null,
  discountPercent: null, depositAmount: '600', expiresAt: '2040-06-01T10:00:00Z',
  confirmation: { status: 'NOT_APPLICABLE' as const, attempts: 0, sentAt: null, lastError: null }
};
let response = { totalPrice: '2700', originalTotalPrice: '3000', discountPercent: '10' as string | null };
let status = 200;

async function show() {
  render(<QueryClientProvider client={new QueryClient()}><AdminBookings /></QueryClientProvider>);
  await screen.findByText('Anna');
}
async function openEditor() {
  await show();
  fireEvent.click(screen.getByRole('button', { name: 'Edytuj cenę' }));
}

beforeEach(async () => {
  await i18n.changeLanguage('pl');
  localStorage.setItem('adminToken', 'synthetic');
  response = { totalPrice: '2700', originalTotalPrice: '3000', discountPercent: '10' };
  status = 200;
  vi.spyOn(adminApi, 'getAdminBookings').mockResolvedValue([booking]);
  vi.spyOn(adminApi, 'updateBookingDeposit').mockResolvedValue({ depositAmount: '800' });
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(response), {
    status, headers: { 'Content-Type': 'application/json' }
  })));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear(); });

describe('pending booking price editor', () => {
  it('previews the original-based discount without changing the paid deposit', async () => {
    await openEditor();
    fireEvent.click(screen.getByLabelText('Rabat procentowy'));
    fireEvent.change(screen.getByLabelText('Rabat (%)'), { target: { value: '10' } });
    expect(screen.getByText('Cena końcowa: 2700 PLN')).toBeInTheDocument();
    expect(screen.getByText('Do dopłaty na miejscu: 2100 PLN')).toBeInTheDocument();
    expect(screen.getByLabelText('Zaliczka Anna')).toHaveValue('600');
    expect(screen.getByRole('button', { name: 'Potwierdź' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz cenę' }));
    expect(await screen.findByText('Zapisano cenę')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Potwierdź' })).not.toBeDisabled();
    expect(screen.getByText('2700 PLN')).toBeInTheDocument();
  });

  it('accepts comma-decimal manual amounts and shows overpayment instead of a negative balance', async () => {
    response = { totalPrice: '500.5', originalTotalPrice: '3000', discountPercent: null };
    await openEditor();
    fireEvent.change(screen.getByLabelText('Cena końcowa (PLN)'), { target: { value: '500,50' } });
    expect(screen.getByText('Do dopłaty na miejscu: 0 PLN')).toBeInTheDocument();
    expect(screen.getByText('Nadpłata: 99,50 PLN')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz cenę' }));
    await screen.findByText('Zapisano cenę');
    expect(screen.getByText('500,50 PLN')).toBeInTheDocument();
    expect(screen.getByLabelText('Zaliczka Anna')).toHaveValue('600');
  });

  it('preserves the original quote when switching between manual and discount modes', async () => {
    vi.mocked(adminApi.getAdminBookings).mockResolvedValue([{
      ...booking, totalPrice: '2000', originalTotalPrice: '3000', discountPercent: null
    }]);
    await openEditor();
    fireEvent.click(screen.getByLabelText('Rabat procentowy'));
    fireEvent.change(screen.getByLabelText('Rabat (%)'), { target: { value: '10' } });
    expect(screen.getByText('Cena końcowa: 2700 PLN')).toBeInTheDocument();
  });

  it('blocks confirmation while a deposit is unsaved or still saving', async () => {
    let finish!: (value: { depositAmount: string }) => void;
    vi.mocked(adminApi.updateBookingDeposit).mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    await show();
    const input = screen.getByLabelText('Zaliczka Anna');
    fireEvent.change(input, { target: { value: '800' } });
    const confirm = screen.getByRole('button', { name: 'Potwierdź' });
    expect(confirm).toBeDisabled();
    fireEvent.click(within(input.parentElement!).getByRole('button', { name: 'Zapisz zaliczkę' }));
    expect(confirm).toBeDisabled();
    await act(async () => { finish({ depositAmount: '800' }); });
    expect(confirm).not.toBeDisabled();
  });

  it('keeps an in-flight price save blocked across filter changes and applies its result', async () => {
    let finish!: (value: Response) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => { finish = resolve; })));
    await openEditor();
    fireEvent.change(screen.getByLabelText('Cena końcowa (PLN)'), { target: { value: '2500' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz cenę' }));
    fireEvent.click(screen.getByRole('button', { name: 'Potwierdzone (0)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Wszystkie (1)' }));
    expect(screen.getByRole('button', { name: 'Potwierdź' })).toBeDisabled();
    await act(async () => { finish(new Response(JSON.stringify({
      totalPrice: '2500', originalTotalPrice: '3000', discountPercent: null
    }), { status: 200 })); });
    expect(await screen.findByText('2500 PLN')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Potwierdź' })).not.toBeDisabled();
  });

  it('does not treat an empty deposit draft as a saved zero deposit', async () => {
    vi.mocked(adminApi.getAdminBookings).mockResolvedValue([{ ...booking, depositAmount: '0' }]);
    await show();
    fireEvent.change(screen.getByLabelText('Zaliczka Anna'), { target: { value: '' } });
    expect(screen.getByRole('button', { name: 'Potwierdź' })).toBeDisabled();
  });

  it.each(['-1', 'abc', '1.001'])('rejects an invalid manual amount %s without saving', async (amount) => {
    await openEditor();
    fireEvent.change(screen.getByLabelText('Cena końcowa (PLN)'), { target: { value: amount } });
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz cenę' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Podaj poprawną kwotę');
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Potwierdź' })).toBeDisabled();
  });

  it('retains the draft and blocks confirmation after a failed save', async () => {
    status = 409;
    await openEditor();
    fireEvent.change(screen.getByLabelText('Cena końcowa (PLN)'), { target: { value: '2500' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz cenę' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Nie udało się zapisać ceny');
    expect(screen.getByLabelText('Cena końcowa (PLN)')).toHaveValue('2500');
    expect(screen.getByRole('button', { name: 'Potwierdź' })).toBeDisabled();
  });

  it.each(['CONFIRMED', 'CANCELLED', 'EXPIRED'] as const)('does not edit a %s booking', async (state) => {
    vi.mocked(adminApi.getAdminBookings).mockResolvedValue([{ ...booking, status: state }]);
    await show();
    expect(screen.queryByRole('button', { name: 'Edytuj cenę' })).not.toBeInTheDocument();
  });

  it('does not edit an expired pending hold', async () => {
    vi.mocked(adminApi.getAdminBookings).mockResolvedValue([{ ...booking, expiresAt: '2020-01-01T00:00:00Z' }]);
    await show();
    expect(screen.queryByRole('button', { name: 'Edytuj cenę' })).not.toBeInTheDocument();
  });

  it('shows the payment breakdown in English', async () => {
    await i18n.changeLanguage('en');
    await show();
    fireEvent.click(screen.getByRole('button', { name: 'Edit price' }));
    expect(screen.getByText('Final total: 3000 PLN')).toBeInTheDocument();
    expect(screen.getByText('Remaining on arrival: 2400 PLN')).toBeInTheDocument();
  });
});
