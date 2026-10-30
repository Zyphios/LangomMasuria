import { Prisma, PrismaClient } from '@prisma/client';

export class BookingOperationError extends Error {
  constructor(public status: 400 | 404 | 409 | 429 | 503, public code: string, message = code, public retryAfter?: number) {
    super(message);
  }
}

export async function withBookingTransaction<T>(
  db: PrismaClient,
  action: (tx: Prisma.TransactionClient, now: Date) => Promise<T>
): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT TRUE AS locked FROM pg_advisory_xact_lock(20261028::bigint)`;
        return action(tx, new Date());
      }, { maxWait: 10000, timeout: 10000 });
    } catch (error) {
      const referenceCollision = error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' && Array.isArray(error.meta?.target) && error.meta.target.includes('reference');
      if (!referenceCollision || attempt >= 4) throw error;
    }
  }
}
