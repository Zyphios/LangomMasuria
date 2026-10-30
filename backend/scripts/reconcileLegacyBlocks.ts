import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { applyLegacyBlockSelection, reportLegacyBlocks } from '../src/services/legacyBlocks';
import { BookingOperationError } from '../src/services/bookingTransaction';

async function main() {
  const db = new PrismaClient();
  try {
    const [command, ...ids] = process.argv.slice(2);
    if (command === 'report' && !ids.length) {
      console.info(JSON.stringify(await reportLegacyBlocks(db), null, 2));
    } else if (command === 'apply' && ids.length) {
      console.info(JSON.stringify({ removed: await applyLegacyBlockSelection(db, ids) }));
    } else {
      throw new Error('Usage: reconcileLegacyBlocks report | apply <approved-id> ...');
    }
  } catch (error) {
    console.error(error instanceof BookingOperationError ? error.code
      : error instanceof Error && error.message.startsWith('Usage:') ? error.message : 'Legacy reconciliation failed; check database connectivity.');
    process.exitCode = 1;
  } finally { await db.$disconnect(); }
}

if (require.main === module) void main();
