import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Lagom123!', 10);

  await prisma.pricingSeason.createMany({
    data: [
      { namePl: 'Sezon niski', nameEn: 'Low season', pricePerNight: new Prisma.Decimal(600), dateFrom: new Date('2026-10-01'), dateTo: new Date('2027-04-30'), isFeatured: false },
      { namePl: 'Sezon wysoki', nameEn: 'High season', pricePerNight: new Prisma.Decimal(1200), dateFrom: new Date('2026-05-01'), dateTo: new Date('2026-09-30'), isFeatured: true },
      { namePl: 'Święta i Nowy Rok', nameEn: 'Holidays', pricePerNight: new Prisma.Decimal(1500), dateFrom: new Date('2026-12-20'), dateTo: new Date('2027-01-05'), isFeatured: false }
    ],
    skipDuplicates: true
  });

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
    ],
    skipDuplicates: true
  });

  await prisma.adminUser.upsert({
    where: { email: process.env.ADMIN_EMAIL || 'admin@lagommasuria.pl' },
    update: { passwordHash },
    create: { email: process.env.ADMIN_EMAIL || 'admin@lagommasuria.pl', passwordHash }
  });
}

main().finally(async () => prisma.$disconnect());
