import { PrismaClient } from '@prisma/client';
import { processNextConfirmation, retryConfirmation } from '../src/services/confirmationQueue';
import { changeBookingStatus } from '../src/services/bookingLifecycle';

const db = new PrismaClient();
beforeEach(async () => { await db.booking.deleteMany(); });
afterAll(() => db.$disconnect());

const queued = () => db.booking.create({ data: {
  reference: 'QUEUE-TEST', guestName: 'Test', guestPhone: '0', guestEmail: 'test@example.invalid',
  checkIn: new Date('2030-06-10'), checkOut: new Date('2030-06-12'), guestsCount: 2,
  totalPrice: 1000, status: 'CONFIRMED', confirmationEmail: { create: {} }
} });

it('persists a failed SMTP attempt then sends the same task after its retry time', async () => {
  const booking = await queued();
  const now = new Date();
  await processNextConfirmation(db, now, async () => { throw new Error('private SMTP details'); });
  const failed = await db.confirmationEmail.findUniqueOrThrow({ where: { bookingId: booking.id } });
  expect(failed.status).toBe('QUEUED');
  expect(failed.attempts).toBe(1);
  expect(failed.lastError).toBe('SMTP_SEND_FAILED');
  expect((await db.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe('CONFIRMED');
  await processNextConfirmation(db, new Date(now.getTime() + 61000), async () => {});
  expect((await db.confirmationEmail.findUniqueOrThrow({ where: { bookingId: booking.id } })).status).toBe('SENT');
  expect(await db.confirmationEmail.count()).toBe(1);
});

it('allows only one worker to claim a task', async () => {
  await queued();
  const outcomes = await Promise.all([
    processNextConfirmation(db, new Date(), async () => {}),
    processNextConfirmation(db, new Date(), async () => {})
  ]);
  expect(outcomes.filter(Boolean)).toHaveLength(1);
  expect((await db.confirmationEmail.findFirstOrThrow()).attempts).toBe(1);
});

it('does not classify a database failure after SMTP acceptance as a failed send', async () => {
  await queued();
  const send = jest.fn(async () => {});
  const update = jest.spyOn(db.confirmationEmail, 'updateMany').mockRejectedValueOnce(new Error('DATABASE_UNAVAILABLE'));
  try {
    await expect(processNextConfirmation(db, new Date(), send)).rejects.toThrow('DATABASE_UNAVAILABLE');
    expect(send).toHaveBeenCalledTimes(1);
    const task = await db.confirmationEmail.findFirstOrThrow();
    expect(task.status).toBe('SENDING');
    expect(task.lastError).toBeNull();
  } finally { update.mockRestore(); }
});

it('does not send a cancelled booking or automatically send a fourth leased attempt', async () => {
  const booking = await queued();
  await db.confirmationEmail.updateMany({ data: { status: 'SENDING', attempts: 3, leaseUntil: new Date(0), leaseToken: 'stale' } });
  await processNextConfirmation(db, new Date(), async () => { throw new Error('Must not send'); });
  expect((await db.confirmationEmail.findFirstOrThrow()).lastError).toBe('DELIVERY_UNKNOWN');
  await retryConfirmation(db, booking.id);
  await db.booking.update({ where: { id: booking.id }, data: { status: 'CANCELLED' } });
  await processNextConfirmation(db, new Date(), async () => { throw new Error('Must not send'); });
  expect((await db.confirmationEmail.findFirstOrThrow()).status).toBe('CANCELLED');
});

it('stops after three missing-SMTP attempts and retries only through an explicit owner action', async () => {
  const booking = await queued();
  const send = jest.fn(async () => { throw new Error('SMTP_NOT_CONFIGURED'); });
  const now = new Date();
  for (const delay of [0, 60000, 360000, 720000]) {
    await processNextConfirmation(db, new Date(now.getTime() + delay), send);
  }
  expect(send).toHaveBeenCalledTimes(3);
  const failed = await db.confirmationEmail.findFirstOrThrow();
  expect(failed.status).toBe('FAILED');
  expect(failed.lastError).toBe('SMTP_NOT_CONFIGURED');
  expect((await db.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe('CONFIRMED');
  await retryConfirmation(db, booking.id);
  await processNextConfirmation(db, new Date(now.getTime() + 720001), async () => {});
  expect((await db.confirmationEmail.findFirstOrThrow()).status).toBe('SENT');
  expect(await db.confirmationEmail.count()).toBe(1);
});

it.each(['PENDING', 'CANCELLED'] as const)('delivers and retries the current %s notification', async (kind) => {
  const booking = await queued();
  await db.booking.update({ where: { id: booking.id }, data: {
    status: kind, expiresAt: kind === 'PENDING' ? new Date(Date.now() + 86400000) : null
  } });
  await db.confirmationEmail.update({ where: { bookingId: booking.id }, data: { kind } });
  const now = new Date();
  for (const delay of [0, 60000, 360000]) {
    await processNextConfirmation(db, new Date(now.getTime() + delay), async () => { throw new Error('SMTP failed'); });
  }
  expect(await db.confirmationEmail.findUnique({ where: { bookingId: booking.id } }))
    .toMatchObject({ kind, status: 'FAILED', attempts: 3 });
  await retryConfirmation(db, booking.id);
  let deliveredKind: string | undefined;
  await processNextConfirmation(db, new Date(now.getTime() + 360001), async (_booking, actualKind) => { deliveredKind = actualKind; });
  expect(deliveredKind).toBe(kind);
  expect(await db.confirmationEmail.findUnique({ where: { bookingId: booking.id } }))
    .toMatchObject({ kind, status: 'SENT' });
});

it('does not send an expired pending notification', async () => {
  const booking = await queued();
  await db.booking.update({ where: { id: booking.id }, data: { status: 'PENDING', expiresAt: new Date(0) } });
  await db.confirmationEmail.update({ where: { bookingId: booking.id }, data: { kind: 'PENDING' } });
  await processNextConfirmation(db, new Date(), async () => { throw new Error('Must not send'); });
  expect(await db.confirmationEmail.findUnique({ where: { bookingId: booking.id } })).toMatchObject({ status: 'CANCELLED' });
});

it('does not overwrite a newly queued rejection when an older in-flight send completes', async () => {
  const booking = await queued();
  await processNextConfirmation(db, new Date(), async () => {
    await changeBookingStatus(db, booking.id, 'CANCELLED');
  });
  expect(await db.confirmationEmail.findUnique({ where: { bookingId: booking.id } }))
    .toMatchObject({ kind: 'CANCELLED', status: 'QUEUED', attempts: 0 });
  let deliveredKind: string | undefined;
  await processNextConfirmation(db, new Date(), async (_booking, kind) => { deliveredKind = kind; });
  expect(deliveredKind).toBe('CANCELLED');
  expect(await db.confirmationEmail.findUnique({ where: { bookingId: booking.id } })).toMatchObject({ status: 'SENT' });
});
