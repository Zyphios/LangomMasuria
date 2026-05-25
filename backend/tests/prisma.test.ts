import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('database seed', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates the expected bootstrap records', async () => {
    const pricingCount = await prisma.pricingSeason.count();
    const galleryCount = await prisma.galleryImage.count();
    const adminUser = await prisma.adminUser.findUnique({ where: { email: 'admin@lagommasuria.pl' } });

    expect(pricingCount).toBe(3);
    expect(galleryCount).toBe(8);
    expect(adminUser).not.toBeNull();
  });
});
