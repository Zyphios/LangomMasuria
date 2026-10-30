import { buildGuestConfirmationEmail, buildOwnerBookingEmail, buildOwnerMessageEmail, buildBookingVerificationEmail,
  sendBookingVerificationEmail, sendGuestConfirmationEmail } from '../src/services/email';
import { Prisma, type Booking, type ContactMessage } from '@prisma/client';

describe('notification recipients', () => {
  const booking: Booking = {
    id: 'booking-test',
    reference: 'LM-20261027-TEST01',
    guestName: 'Anna',
    guestEmail: 'anna@example.com',
    guestPhone: '+48123456789',
    checkIn: new Date('2026-11-01'),
    checkOut: new Date('2026-11-04'),
    guestsCount: 2,
    status: 'PENDING',
    source: 'WEBSITE',
    totalPrice: new Prisma.Decimal(2100),
    originalTotalPrice: null, discountPercent: null,
    depositAmount: new Prisma.Decimal(0),
    notes: null,
    locale: 'pl',
    createdAt: new Date('2026-10-27'),
    expiresAt: new Date('2026-10-28'),
    decisionTokenHash: null
  };
  const contact: ContactMessage = {
    id: 'contact-test',
    name: 'Maria',
    email: 'maria@example.com',
    message: 'Czy akceptujecie psy?',
    isRead: false,
    createdAt: new Date('2026-10-27')
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    ['', 'domeknamazurskiej@gmail.com'],
    ['owner-override@example.com', 'owner-override@example.com']
  ])('routes owner notifications with OWNER_EMAIL=%s', (configured, expected) => {
    jest.replaceProperty(process, 'env', {
      ...process.env,
      OWNER_EMAIL: configured,
      SMTP_HOST: '',
      SMTP_USER: ''
    });

    jest.isolateModules(() => {
      const email = jest.requireActual<typeof import('../src/services/email')>('../src/services/email');
      expect(email.buildOwnerBookingEmail(booking).to).toBe(expected);
      expect(email.buildOwnerMessageEmail(contact).to).toBe(expected);
      expect(email.buildGuestConfirmationEmail({ ...booking, guestEmail: 'anna@example.com' }).to)
        .toBe('anna@example.com');
    });
  });
});

describe('email templates', () => {
  const booking: Booking = {
    id: 'template', reference: 'TEMPLATE-1', guestName: '<script>alert(1)</script>', guestEmail: 'test@example.invalid',
    guestPhone: '0', checkIn: new Date('2030-06-10'), checkOut: new Date('2030-06-12'), guestsCount: 2,
    status: 'PENDING', source: 'WEBSITE', totalPrice: new Prisma.Decimal(1000), depositAmount: new Prisma.Decimal(0),
    originalTotalPrice: null, discountPercent: null,
    notes: '<img src=x onerror=alert(1)>', locale: 'pl', createdAt: new Date('2030-01-01'),
    expiresAt: new Date('2030-01-02'), decisionTokenHash: null
  };
  it('escapes owner content and supplies two fragment-only decision links', () => {
    const message = buildOwnerBookingEmail(booking, 'a'.repeat(64));
    expect(message.html).not.toContain('<script>');
    expect(message.html).not.toContain('<img src=x');
    expect(message.html).toContain('&lt;script&gt;');
    expect(message.text).toContain('/booking-decision#token=');
    expect(message.text).toContain('decision=CONFIRMED');
    expect(message.text).toContain('decision=CANCELLED');
    expect(message.text).not.toContain('/booking-decision?token=');
  });
  it.each(['pl', 'en'] as const)('builds a %s verification email without promising a hold', (locale) => {
    const message = buildBookingVerificationEmail({ guestName: 'Test', guestEmail: ' TEST@example.invalid ', guestPhone: '0',
      checkIn: '2030-06-10', checkOut: '2030-06-12', guestsCount: 2, locale }, 'a'.repeat(64), new Date('2030-01-01T10:15:00Z'));
    expect(message.to).toBe('test@example.invalid');
    expect(message.text).toContain('/verify-booking#token=');
    expect(message.text).toContain(locale === 'pl' ? 'Termin NIE jest jeszcze blokowany' : 'Your dates are NOT held yet');
  });
  it('fails explicitly without SMTP for both verification and final confirmation', async () => {
    await expect(sendGuestConfirmationEmail({ ...booking, guestEmail: 'test@example.invalid' })).rejects.toThrow('SMTP_NOT_CONFIGURED');
    await expect(sendBookingVerificationEmail({ guestName: 'Test', guestEmail: 'test@example.invalid', guestPhone: '0',
      checkIn: '2030-06-10', checkOut: '2030-06-12', guestsCount: 2, locale: 'pl' }, 'a'.repeat(64), new Date()))
      .rejects.toThrow('SMTP_NOT_CONFIGURED');
  });
  it('builds the owner booking subject', () => {
    const message = buildOwnerBookingEmail({ reference: 'LM-20260601-ANN4K2', guestName: 'Anna', guestEmail: 'anna@example.com', guestPhone: '+48123456789', checkIn: new Date('2026-06-01'), checkOut: new Date('2026-06-04'), guestsCount: 4, totalPrice: { toString: () => '3800' } } as never);
    expect(message.subject).toBe('Nowa rezerwacja LM-20260601-ANN4K2 — Anna');
  });

  it('builds the owner message subject', () => {
    const message = buildOwnerMessageEmail({ name: 'Maria', email: 'maria@example.com', message: 'Czy jest kominek?' } as never);
    expect(message.subject).toBe('Nowa wiadomość od Maria');
  });

  it.each([
    ['pl', 'Wpłacona zaliczka: 600.00 PLN', 'Do dopłaty na miejscu: 2100.00 PLN'],
    ['en', 'Deposit paid: 600.00 PLN', 'Remaining on arrival: 2100.00 PLN']
  ])('includes paid deposit and remaining balance in %s confirmations', (locale, deposit, balance) => {
    const message = buildGuestConfirmationEmail({ ...booking, guestEmail: 'test@example.invalid', locale,
      totalPrice: new Prisma.Decimal(2700), depositAmount: new Prisma.Decimal(600) });
    expect(message.text).toContain(deposit);
    expect(message.text).toContain(balance);
  });

  it.each([
    ['pl', 'Do dopłaty na miejscu: 0.00 PLN', 'Nadpłata: 100.00 PLN'],
    ['en', 'Remaining on arrival: 0.00 PLN', 'Overpayment: 100.00 PLN']
  ])('shows overpayment without a negative balance in %s confirmations', (locale, balance, overpayment) => {
    const message = buildGuestConfirmationEmail({ ...booking, guestEmail: 'test@example.invalid', locale,
      totalPrice: new Prisma.Decimal(500), depositAmount: new Prisma.Decimal(600) });
    expect(message.text).toContain(balance);
    expect(message.text).toContain(overpayment);
    expect(message.text).not.toContain('-100');
  });

  it('builds the guest confirmation in Polish', () => {
    const message = buildGuestConfirmationEmail({ ...booking, reference: 'LM-20260601-ANN4K2', guestName: 'Anna',
      checkIn: new Date('2026-06-01'), checkOut: new Date('2026-06-04'), totalPrice: new Prisma.Decimal(3800),
      locale: 'pl', guestEmail: 'anna@example.com' });
    expect(message.subject).toBe('Potwierdzenie rezerwacji — Domek na Mazurskiej');
    expect(message.text).toContain('cisza nocna 22:00-06:00');
  });
});
