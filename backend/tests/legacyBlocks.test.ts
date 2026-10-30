import { PrismaClient } from '@prisma/client';
import { reportLegacyBlocks, applyLegacyBlockSelection } from '../src/services/legacyBlocks';

const db = new PrismaClient();
beforeEach(async () => { await db.booking.deleteMany(); await db.blockedDate.deleteMany(); });
afterAll(() => db.$disconnect());

it('reports generated and ambiguous blocks without deleting them or exposing guest data', async () => {
  await db.blockedDate.createMany({ data: [
    { date: new Date('2030-06-10'), reason: 'Confirmed booking' },
    { date: new Date('2030-06-11'), reason: 'Manual phone booking' },
    { date: new Date('2030-06-12'), reason: 'Repairs' }
  ] });
  const report = await reportLegacyBlocks(db);
  expect(report).toHaveLength(2);
  expect(await db.blockedDate.count()).toBe(3);
  const generated = report.find((row) => row.reason === 'Confirmed booking')!;
  await applyLegacyBlockSelection(db, [generated.blockId]);
  expect(await db.blockedDate.count()).toBe(2);
  expect(await db.blockedDate.findFirst({ where: { reason: 'Repairs' } })).not.toBeNull();
  expect(JSON.stringify(report)).not.toContain('guestEmail');
});

it('rejects duplicate, unknown and non-generated IDs without partially deleting a selection', async () => {
  const generated = await db.blockedDate.create({ data: { date: new Date('2030-06-10'), reason: 'Confirmed booking' } });
  const manual = await db.blockedDate.create({ data: { date: new Date('2030-06-11'), reason: 'Repairs' } });
  for (const ids of [[], [generated.id, generated.id], [generated.id, 'missing'], [generated.id, manual.id]]) {
    await expect(applyLegacyBlockSelection(db, ids)).rejects.toMatchObject({ code: 'INVALID_LEGACY_SELECTION' });
    expect(await db.blockedDate.count()).toBe(2);
  }
});
