import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

afterAll(() => db.$disconnect());

it('provides persistent expiry, unique mail tasks and hashed link storage', async () => {
  const columns = await db.$queryRaw<{ column_name: string }[]>`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Booking'
  `;
  expect(columns.map((column) => column.column_name)).toEqual(
    expect.arrayContaining(['expiresAt', 'decisionTokenHash'])
  );
  const tables = await db.$queryRaw<{ table_name: string }[]>`
    SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
  `;
  expect(tables.map((table) => table.table_name)).toEqual(
    expect.arrayContaining(['ConfirmationEmail', 'BookingVerification', 'BookingAbuseEvent'])
  );
});

it('rejects a pending booking without its server deadline in the database itself', async () => {
  await db.booking.deleteMany({ where: { id: 'schema-no-deadline' } });
  await expect(db.$executeRaw`
    INSERT INTO "Booking" (id, reference, "guestName", "guestPhone", "checkIn", "checkOut",
      "guestsCount", "totalPrice", status, locale, "createdAt")
    VALUES ('schema-no-deadline', 'SCHEMA-NO-DEADLINE', 'Test', '0',
      '2030-06-10'::date, '2030-06-12'::date, 2, 1000, 'PENDING', 'pl', NOW())
  `).rejects.toThrow('pending_deadline_required');
});
