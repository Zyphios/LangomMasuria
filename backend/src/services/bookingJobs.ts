import { PrismaClient } from '@prisma/client';
import { expirePendingBookings } from './bookingLifecycle';
import { withBookingTransaction } from './bookingTransaction';
import { processNextConfirmation, type ConfirmationSender } from './confirmationQueue';
import { sendGuestConfirmationEmail } from './email';
import { bookingConfig } from './bookingLinks';

export async function runBookingMaintenance(db: PrismaClient, now: Date, send: ConfirmationSender) {
  await withBookingTransaction(db, async (tx) => {
    await expirePendingBookings(tx, now);
    const cutoff = new Date(now.getTime() - 48 * 3600000);
    await tx.bookingVerification.deleteMany({ where: { expiresAt: { lt: cutoff } } });
    const budgetCutoff = new Date(now.getTime() - Math.max(48 * 3600000, bookingConfig().cooldown * 1000));
    await tx.bookingAbuseEvent.deleteMany({ where: { createdAt: { lt: budgetCutoff } } });
  });
  for (let count = 0; count < 10; count += 1) {
    if (!await processNextConfirmation(db, now, send)) break;
  }
}

export function startBookingJobs(db: PrismaClient) {
  let running: Promise<void> | null = null;
  let stopped = false;
  const tick = () => {
    if (running || stopped) return;
    running = runBookingMaintenance(db, new Date(), sendGuestConfirmationEmail)
      .catch(() => { console.error('booking maintenance failed'); })
      .finally(() => { running = null; });
  };
  tick();
  const timer = setInterval(tick, 30000);
  return { stop: async () => { stopped = true; clearInterval(timer); await running; } };
}
