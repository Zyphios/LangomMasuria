import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Lagom123!', 10);

  const existingSeasons = await prisma.pricingSeason.count();
  if (existingSeasons === 0) {
    await prisma.pricingSeason.createMany({
      data: [
        { namePl: 'Sezon niski', nameEn: 'Low season', pricePerNight: new Prisma.Decimal(700), dateFrom: new Date('2026-10-01'), dateTo: new Date('2027-04-30'), isFeatured: false },
        { namePl: 'Sezon wysoki', nameEn: 'High season', pricePerNight: new Prisma.Decimal(800), dateFrom: new Date('2026-05-01'), dateTo: new Date('2026-09-30'), isFeatured: true },
        { namePl: 'Święta i Nowy Rok', nameEn: 'Holidays', pricePerNight: new Prisma.Decimal(1000), dateFrom: new Date('2026-12-20'), dateTo: new Date('2027-01-05'), isFeatured: false }
      ]
    });
  }

  const existingImages = await prisma.galleryImage.count();
  if (existingImages === 0) {
    await prisma.galleryImage.createMany({
      data: [
        { url: '/glowne-foto.jpg', captionPl: 'Dom o zmierzchu', captionEn: 'House at dusk', sortOrder: 1 },
        { url: '/shared image (19).jpg', captionPl: 'Dom nocą, w świetle latarni', captionEn: 'The house glowing at night', sortOrder: 2 },
        { url: '/shared image (3).jpg', captionPl: 'Dom nad stawem', captionEn: 'The house by the pond', sortOrder: 3 },
        { url: '/shared image (13).jpg', captionPl: 'Jacuzzi z widokiem na łąki', captionEn: 'Hot tub with meadow views', sortOrder: 4 },
        { url: '/IMG_20260705_162852.jpg', captionPl: 'Kuchnia', captionEn: 'Kitchen', sortOrder: 5 },
        { url: '/IMG-20260705-WA0003.jpg', captionPl: 'Detale kuchni', captionEn: 'Kitchen details', sortOrder: 6 },
        { url: '/shared image (5).jpg', captionPl: 'Kuchnia i jadalnia', captionEn: 'Kitchen and dining nook', sortOrder: 7 },
        { url: '/IMG_20260705_163047.jpg', captionPl: 'Salon z widokiem na taras', captionEn: 'Living room with terrace view', sortOrder: 8 },
        { url: '/shared image (7).jpg', captionPl: 'Salon z antresolą', captionEn: 'Living room with mezzanine view', sortOrder: 9 },
        { url: '/shared image (6).jpg', captionPl: 'Sypialnia z widokiem na łąki', captionEn: 'Bedroom with meadow view', sortOrder: 10 },
        { url: '/shared image (20).jpg', captionPl: 'Antresola sypialniana', captionEn: 'Loft bedroom', sortOrder: 11 },
        { url: '/shared image (21).jpg', captionPl: 'Łazienka', captionEn: 'Bathroom', sortOrder: 12 }
      ]
    });
  }

  await prisma.adminUser.upsert({
    where: { email: process.env.ADMIN_EMAIL || 'admin@lagommasuria.pl' },
    update: { passwordHash },
    create: { email: process.env.ADMIN_EMAIL || 'admin@lagommasuria.pl', passwordHash }
  });
}

main().finally(async () => prisma.$disconnect());
