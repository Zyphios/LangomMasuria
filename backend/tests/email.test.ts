import { buildGuestConfirmationEmail, buildOwnerBookingEmail, buildOwnerMessageEmail } from '../src/services/email';

describe('email templates', () => {
  it('builds the owner booking subject', () => {
    const message = buildOwnerBookingEmail({ reference: 'LM-20260601-ANN4K2', guestName: 'Anna', guestEmail: 'anna@example.com', guestPhone: '+48123456789', checkIn: new Date('2026-06-01'), checkOut: new Date('2026-06-04'), guestsCount: 4, totalPrice: { toString: () => '3800' } } as never);
    expect(message.subject).toBe('Nowa rezerwacja LM-20260601-ANN4K2 — Anna');
  });

  it('builds the owner message subject', () => {
    const message = buildOwnerMessageEmail({ name: 'Maria', email: 'maria@example.com', message: 'Czy jest kominek?' } as never);
    expect(message.subject).toBe('Nowa wiadomość od Maria');
  });

  it('builds the guest confirmation in Polish', () => {
    const message = buildGuestConfirmationEmail({ reference: 'LM-20260601-ANN4K2', guestName: 'Anna', checkIn: new Date('2026-06-01'), checkOut: new Date('2026-06-04'), totalPrice: { toString: () => '3800' }, locale: 'pl', guestEmail: 'anna@example.com' } as never);
    expect(message.subject).toBe('Potwierdzenie rezerwacji — Lagom Masuria');
    expect(message.text).toContain('cisza nocna 22:00-06:00');
  });
});
