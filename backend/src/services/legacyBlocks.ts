import { Prisma, PrismaClient } from '@prisma/client';
import { BookingOperationError, withBookingTransaction } from './bookingTransaction';

const generatedReasons = ['Confirmed booking', 'Manual phone booking'];

export async function reportLegacyBlocks(db: Prisma.TransactionClient) {
  const blocks = await db.blockedDate.findMany({ where: { reason: { in: generatedReasons } }, orderBy: { date: 'asc' } });
  return Promise.all(blocks.map(async (block) => ({
    blockId: block.id, date: block.date.toISOString().slice(0, 10), reason: block.reason,
    bookings: await db.booking.findMany({
      where: { checkIn: { lte: block.date }, checkOut: { gt: block.date } },
      select: { id: true, checkIn: true, checkOut: true, status: true, expiresAt: true, source: true },
      orderBy: { checkIn: 'asc' }
    })
  })));
}

export async function applyLegacyBlockSelection(db: PrismaClient, ids: string[]): Promise<number> {
  if (!ids.length || new Set(ids).size !== ids.length || ids.some((id) => !id.trim() || id.includes('*'))) {
    throw new BookingOperationError(400, 'INVALID_LEGACY_SELECTION');
  }
  return withBookingTransaction(db, async (tx) => {
    const blocks = await tx.blockedDate.findMany({ where: { id: { in: ids } } });
    if (blocks.length !== ids.length || blocks.some((block) => !block.reason || !generatedReasons.includes(block.reason))) {
      throw new BookingOperationError(400, 'INVALID_LEGACY_SELECTION');
    }
    console.info('Approved legacy block selection:', JSON.stringify(blocks));
    return (await tx.blockedDate.deleteMany({ where: { id: { in: ids } } })).count;
  });
}
