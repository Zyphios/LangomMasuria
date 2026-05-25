import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

describe('database seed', () => {
  beforeAll(async () => {
    // Re-seed to ensure deterministic state
    const passwordHash = await bcrypt.hash('Lagom123!', 10);
    await prisma.pricingSeason.deleteMany();
    await prisma.pricingSeason.createMany({
      data: [
        { namePl: 'Sezon niski', nameEn: 'Low season', pricePerNight: new Prisma.Decimal(600), dateFrom: new Date('2026-10-01'), dateTo: new Date('2027-04-30'), isFeatured: false },
        { namePl: 'Sezon wysoki', nameEn: 'High season', pricePerNight: new Prisma.Decimal(1200), dateFrom: new Date('2026-05-01'), dateTo: new Date('2026-09-30'), isFeatured: true },
        { namePl: 'Święta i Nowy Rok', nameEn: 'Holidays', pricePerNight: new Prisma.Decimal(1500), dateFrom: new Date('2026-12-20'), dateTo: new Date('2027-01-05'), isFeatured: false }
      ]
    });
    await prisma.galleryImage.deleteMany();
    await prisma.galleryImage.createMany({
      data: [
        { url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800', captionPl: 'Widok na jezioro', captionEn: 'Lake view', sortOrder: 1 },
        { url: 'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=800', captionPl: 'Las', captionEn: 'Forest', sortOrder: 2 },
        { url: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800', captionPl: 'Kuchnia', captionEn: 'Kitchen', sortOrder: 3 },
        { url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800', captionPl: 'Salon', captionEn: 'Living room', sortOrder: 4 },
        { url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800', captionPl: 'Sypialnia', captionEn: 'Bedroom', sortOrder: 5 },
        { url: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800', captionPl: 'Łazienka', captionEn: 'Bathroom', sortOrder: 6 },
        { url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800', captionPl: 'Bryła domu', captionEn: 'Exterior', sortOrder: 7 },
        { url: 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800', captionPl: 'Jacuzzi', captionEn: 'Jacuzzi', sortOrder: 8 }
      ]
    });
    await prisma.adminUser.upsert({
      where: { email: 'admin@lagommasuria.pl' },
      update: { passwordHash },
      create: { email: 'admin@lagommasuria.pl', passwordHash }
    });
  });

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
