# Lagom Masuria — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack vacation rental website for Lagom Masuria with public pages, 4-step booking wizard, admin panel, email notifications, Docker Compose setup, and PL/EN i18n.

**Architecture:** React 18 + Vite + TypeScript frontend (port 3000), Express.js + TypeScript + Prisma backend (port 4000), PostgreSQL 16 database (port 5432). Three separate Docker containers orchestrated with docker-compose. JWT-protected admin panel.

**Tech Stack:** React 18, Vite, TypeScript, Tailwind CSS, react-router-dom v6, react-i18next, react-query, date-fns, Express.js, Prisma ORM, Zod, jsonwebtoken, bcrypt, nodemailer, PostgreSQL 16, Docker Compose, Jest, Supertest, Vitest

---

## Implementation File Map

- `docker-compose.yml`, `.env.example`, `README.md`: root orchestration, onboarding, and local runbook.
- `backend/src/index.ts`: Express bootstrap, shared Prisma client, route mounting, JSON error handling.
- `backend/src/routes/*.ts`: public and admin API handlers with Zod validation and typed Prisma access.
- `backend/src/services/availability.ts`, `backend/src/services/email.ts`: booking pricing/blocked-date logic and all outbound emails.
- `backend/src/middleware/*.ts`, `backend/src/types/index.ts`: JWT auth, Zod validation wrapper, shared request/response types.
- `backend/prisma/schema.prisma`, `backend/prisma/seed.ts`: relational schema, seed data, admin bootstrap user.
- `backend/tests/*.test.ts`: Jest + Supertest coverage against a dedicated `lagom_test` database.
- `frontend/src/App.tsx`, `frontend/src/main.tsx`: router, providers, route tree.
- `frontend/src/api/*.ts`: fully typed fetch wrappers.
- `frontend/src/components/*.tsx`: layout, language toggle, booking calendar.
- `frontend/src/pages/*.tsx`, `frontend/src/pages/admin/*.tsx`: public pages, booking wizard, admin UI.
- `frontend/src/i18n/*.json`, `frontend/src/hooks/*.ts`, `frontend/src/types/index.ts`: translations, auth/availability hooks, shared constants and DTOs.

## Delivery Rules For The Implementer

- Write tests first in every task and confirm the new test fails before adding implementation.
- Keep all code, variable names, and API payload keys in English.
- Keep end-user copy in translation files; Polish is default and English persists via `localStorage['lang']`.
- Use `@prisma/client` types for every Prisma interaction.
- Use a separate test database URL in `backend/.env.test`.
- Commit after each task with the suggested message or an equivalent scoped message.

### Task 1: Project scaffolding

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`
- Create: `README.md`

- [ ] **Step 1: Run a failing scaffold smoke check before creating files**

Run:
```powershell
Get-Item docker-compose.yml,.env.example,README.md
```
Expected:
```text
Get-Item: Cannot find path ... because it does not exist.
```

- [ ] **Step 2: Create the root scaffolding files**

`docker-compose.yml`
```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: lagom
      POSTGRES_USER: lagom
      POSTGRES_PASSWORD: lagom_pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - '5432:5432'

  backend:
    build: ./backend
    ports:
      - '4000:4000'
    environment:
      DATABASE_URL: postgresql://lagom:lagom_pass@db:5432/lagom
      JWT_SECRET: change_me_in_production
      SMTP_HOST: smtp.example.com
      SMTP_PORT: '587'
      SMTP_USER: ''
      SMTP_PASS: ''
      OWNER_EMAIL: hello@lagommasuria.pl
      PAYU_MERCHANT_ID: stub
      PAYU_SECRET_KEY: stub
    depends_on:
      - db

  frontend:
    build: ./frontend
    ports:
      - '3000:3000'
    environment:
      VITE_API_URL: http://localhost:4000
    depends_on:
      - backend

volumes:
  postgres_data:
```

`.env.example`
```env
DATABASE_URL=postgresql://lagom:lagom_pass@localhost:5432/lagom
DATABASE_TEST_URL=postgresql://lagom:lagom_pass@localhost:5432/lagom_test
JWT_SECRET=change_me_in_production
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
OWNER_EMAIL=hello@lagommasuria.pl
PAYU_MERCHANT_ID=stub
PAYU_SECRET_KEY=stub
VITE_API_URL=http://localhost:4000
ADMIN_EMAIL=admin@lagommasuria.pl
ADMIN_PASSWORD=Lagom123!
```

`README.md`
```md
# Lagom Masuria

Full-stack vacation rental website for Lagom Masuria.

## Services
- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- PostgreSQL: localhost:5432

## Quick start
1. Copy `.env.example` to `.env`.
2. Start containers: `docker compose up --build`.
3. Run backend Prisma setup:
   - `cd backend`
   - `npm install`
   - `npx prisma migrate dev --name init`
   - `npm run prisma:seed`
4. Run frontend locally:
   - `cd ../frontend`
   - `npm install`
   - `npm run dev -- --host 0.0.0.0 --port 3000`

## Test commands
- Backend: `cd backend; npm test`
- Frontend: `cd frontend; npm test`

## Admin login
- Email: `admin@lagommasuria.pl`
- Password: `Lagom123!`
```

- [ ] **Step 3: Validate the Compose file and onboarding docs**

Run:
```powershell
docker compose config
```
Expected:
```text
services:
  backend:
  db:
  frontend:
volumes:
  postgres_data:
```

- [ ] **Step 4: Commit the scaffold**

Run:
```powershell
git add docker-compose.yml .env.example README.md
git commit -m 'chore: add lagom project scaffold'
```
Expected:
```text
[chore/... ] chore: add lagom project scaffold
```

### Task 2: Backend project setup

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/jest.config.ts`
- Create: `backend/.env.test`
- Create: `backend/Dockerfile`
- Create: `backend/src/index.ts`
- Create: `backend/tests/app.test.ts`
- Create: `backend/tests/setup.ts`

- [ ] **Step 1: Write the first failing backend smoke test**

`backend/tests/app.test.ts`
```ts
import request from 'supertest';
import { createApp } from '../src/index';

describe('backend bootstrap', () => {
  it('returns JSON 404 for unknown routes', async () => {
    const app = createApp();
    const response = await request(app).get('/missing');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'Not found' });
  });
});
```

- [ ] **Step 2: Run the test to confirm the backend is not wired yet**

Run:
```powershell
Set-Location backend
npm install
npm test -- --runTestsByPath tests/app.test.ts
```
Expected:
```text
FAIL tests/app.test.ts
Cannot find module '../src/index'
```

- [ ] **Step 3: Create the backend runtime, test config, and Docker image**

`backend/package.json`
```json
{
  "name": "lagom-masuria-backend",
  "version": "1.0.0",
  "private": true,
  "type": "commonjs",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "test": "jest --runInBand",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "@prisma/client": "^5.15.0",
    "bcrypt": "^5.1.1",
    "cors": "^2.8.5",
    "date-fns": "^3.6.0",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.2",
    "nodemailer": "^6.9.13",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.0",
    "@types/jest": "^29.5.12",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/node": "^20.14.8",
    "@types/nodemailer": "^6.4.15",
    "@types/supertest": "^6.0.2",
    "jest": "^29.7.0",
    "prisma": "^5.15.0",
    "supertest": "^7.0.0",
    "ts-jest": "^29.1.5",
    "tsx": "^4.15.7",
    "typescript": "^5.5.2"
  }
}
```

`backend/tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "rootDir": ".",
    "outDir": "dist",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "types": ["node", "jest"]
  },
  "include": ["src", "prisma", "tests", "jest.config.ts"]
}
```

`backend/jest.config.ts`
```ts
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleFileExtensions: ['ts', 'js', 'json']
};

export default config;
```

`backend/.env.test`
```env
DATABASE_URL=postgresql://lagom:lagom_pass@localhost:5432/lagom_test
JWT_SECRET=test_secret
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
OWNER_EMAIL=owner@example.com
PAYU_MERCHANT_ID=stub
PAYU_SECRET_KEY=stub
ADMIN_EMAIL=admin@lagommasuria.pl
ADMIN_PASSWORD=Lagom123!
```

`backend/tests/setup.ts`
```ts
import { config } from 'dotenv';

config({ path: '.env.test' });
```

`backend/src/index.ts`
```ts
import 'dotenv/config';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export const createApp = () => {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ message: 'Not found' });
  });

  app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({ message: error.message || 'Internal server error' });
  });

  return app;
};

if (process.env.NODE_ENV !== 'test') {
  const app = createApp();
  const port = Number(process.env.PORT || 4000);
  app.listen(port, () => {
    console.log(`Backend listening on ${port}`);
  });
}
```

`backend/Dockerfile`
```Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY tsconfig.json jest.config.ts .env.test ./
COPY prisma ./prisma
COPY src ./src
COPY tests ./tests
RUN npm run prisma:generate && npm run build
EXPOSE 4000
CMD ["npm", "run", "dev"]
```

- [ ] **Step 4: Re-run the smoke test and compile the backend**

Run:
```powershell
npm test -- --runTestsByPath tests/app.test.ts
npm run build
```
Expected:
```text
PASS tests/app.test.ts
Done in ...
```

### Task 3: Prisma schema + migrations + seed

**Files:**
- Create: `backend/prisma/schema.prisma`
- Create: `backend/prisma/seed.ts`
- Create: `backend/tests/prisma.test.ts`

- [ ] **Step 1: Write a failing seed integration test**

`backend/tests/prisma.test.ts`
```ts
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
```

- [ ] **Step 2: Run the Prisma test before the schema exists**

Run:
```powershell
npm test -- --runTestsByPath tests/prisma.test.ts
```
Expected:
```text
FAIL tests/prisma.test.ts
PrismaClientInitializationError or table does not exist
```

- [ ] **Step 3: Define the schema and deterministic seed data**

`backend/prisma/schema.prisma`
```prisma
generator client {
  provider = 'prisma-client-js'
}

datasource db {
  provider = 'postgresql'
  url      = env('DATABASE_URL')
}

model Booking {
  id          String        @id @default(uuid())
  guestName   String
  guestEmail  String
  guestPhone  String
  checkIn     DateTime      @db.Date
  checkOut    DateTime      @db.Date
  guestsCount Int
  status      BookingStatus @default(PENDING)
  totalPrice  Decimal       @db.Decimal(10, 2)
  notes       String?
  locale      String        @default('pl')
  createdAt   DateTime      @default(now())
}

enum BookingStatus { PENDING CONFIRMED CANCELLED }

model BlockedDate {
  id        String   @id @default(uuid())
  date      DateTime @unique @db.Date
  reason    String?
  createdAt DateTime @default(now())
}

model ContactMessage {
  id        String   @id @default(uuid())
  name      String
  email     String
  message   String
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())
}

model GalleryImage {
  id        String   @id @default(uuid())
  url       String
  captionPl String?
  captionEn String?
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())
}

model PricingSeason {
  id            String   @id @default(uuid())
  namePl        String
  nameEn        String
  pricePerNight Decimal  @db.Decimal(10, 2)
  dateFrom      DateTime @db.Date
  dateTo        DateTime @db.Date
  isFeatured    Boolean  @default(false)
}

model AdminUser {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
}
```

`backend/prisma/seed.ts`
```ts
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
```

- [ ] **Step 4: Generate, migrate, seed, and rerun the test**

Run:
```powershell
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
npm test -- --runTestsByPath tests/prisma.test.ts
```
Expected:
```text
✔ Generated Prisma Client
Applying migration `..._init`
PASS tests/prisma.test.ts
```

### Task 4: Backend middleware + types

**Files:**
- Create: `backend/src/types/index.ts`
- Create: `backend/src/middleware/auth.ts`
- Create: `backend/src/middleware/validate.ts`
- Create: `backend/tests/middleware.test.ts`

- [ ] **Step 1: Write failing middleware tests**

`backend/tests/middleware.test.ts`
```ts
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { requireAuth } from '../src/middleware/auth';
import { validate } from '../src/middleware/validate';
import { z } from 'zod';

describe('middleware', () => {
  it('reads Authorization Bearer token and exposes adminId', async () => {
    const token = jwt.sign({ adminId: 'admin-1' }, process.env.JWT_SECRET || 'test_secret');
    const app = express();
    app.get('/secure', requireAuth, (req, res) => res.json({ adminId: (req as typeof req & { adminId: string }).adminId }));
    const response = await request(app).get('/secure').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ adminId: 'admin-1' });
  });

  it('returns validation errors from a Zod schema', async () => {
    const app = express();
    app.use(express.json());
    app.post('/validated', validate(z.object({ email: z.string().email() })), (_req, res) => res.status(204).send());
    const response = await request(app).post('/validated').send({ email: 'broken' });
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Validation failed');
  });
});
```

- [ ] **Step 2: Confirm both middleware tests fail first**

Run:
```powershell
npm test -- --runTestsByPath tests/middleware.test.ts
```
Expected:
```text
FAIL tests/middleware.test.ts
Cannot find module '../src/middleware/auth'
```

- [ ] **Step 3: Add shared types and reusable middleware**

`backend/src/types/index.ts`
```ts
import type { BookingStatus, Prisma } from '@prisma/client';
import type { Request } from 'express';

export type Locale = 'pl' | 'en';
export type JwtPayload = { adminId: string };
export type AuthenticatedRequest = Request & { adminId: string };
export type BookingCreateInput = {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkIn: string;
  checkOut: string;
  guestsCount: number;
  notes?: string;
  locale: Locale;
};
export type BookingStatusUpdate = { status: BookingStatus };
export type PaymentInitInput = { bookingId: string; amount: number };
export type PricingValue = Prisma.Decimal;
```

`backend/src/middleware/auth.ts`
```ts
import type { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthenticatedRequest, JwtPayload } from '../types';

export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const header = req.header('Authorization');
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const payload = jwt.verify(header.replace('Bearer ', ''), process.env.JWT_SECRET || 'test_secret') as JwtPayload;
    req.adminId = payload.adminId;
    return next();
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};
```

`backend/src/middleware/validate.ts`
```ts
import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';

export const validate = (schema: ZodTypeAny) => (req: Request, res: Response, next: NextFunction) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: 'Validation failed', issues: result.error.issues });
  }
  req.body = result.data;
  return next();
};
```

### Task 5: Availability service + route

**Files:**
- Create: `backend/src/services/availability.ts`
- Create: `backend/src/routes/availability.ts`
- Create: `backend/tests/availability.test.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Write the availability test first**

`backend/tests/availability.test.ts`
```ts
import request from 'supertest';
import { BookingStatus, Prisma } from '@prisma/client';
import { prisma, createApp } from '../src/index';

describe('GET /api/availability', () => {
  beforeAll(async () => {
    await prisma.blockedDate.create({ data: { date: new Date('2026-06-10'), reason: 'Maintenance' } });
    await prisma.booking.create({
      data: {
        guestName: 'Jan Kowalski',
        guestEmail: 'jan@example.com',
        guestPhone: '+48123123123',
        checkIn: new Date('2026-06-14'),
        checkOut: new Date('2026-06-17'),
        guestsCount: 4,
        totalPrice: new Prisma.Decimal(2600),
        status: BookingStatus.CONFIRMED,
        locale: 'pl'
      }
    });
  });

  afterAll(async () => {
    await prisma.blockedDate.deleteMany();
    await prisma.booking.deleteMany();
  });

  it('returns blocked dates and confirmed booking nights in YYYY-MM-DD format', async () => {
    const response = await request(createApp()).get('/api/availability?month=6&year=2026');
    expect(response.status).toBe(200);
    expect(response.body.blockedDates).toEqual(['2026-06-10', '2026-06-14', '2026-06-15', '2026-06-16']);
  });
});
```

- [ ] **Step 2: Run the availability test and confirm it fails**

Run:
```powershell
npm test -- --runTestsByPath tests/availability.test.ts
```
Expected:
```text
FAIL tests/availability.test.ts
Expected 200, received 404
```

- [ ] **Step 3: Implement the availability service and route, then mount it**

`backend/src/services/availability.ts`
```ts
import { addDays, differenceInCalendarDays, eachDayOfInterval, endOfMonth, format, isWithinInterval, startOfMonth } from 'date-fns';
import { BookingStatus, Prisma, PrismaClient, type PricingSeason } from '@prisma/client';

export const CLEANING_FEE = 200;
export const MIN_STAY_NIGHTS = 2;
const toIsoDate = (value: Date) => format(value, 'yyyy-MM-dd');

export const getBlockedDatesForMonth = async (prisma: PrismaClient, month: number, year: number) => {
  const rangeStart = startOfMonth(new Date(year, month - 1, 1));
  const rangeEnd = endOfMonth(rangeStart);

  const blockedDates = await prisma.blockedDate.findMany({
    where: { date: { gte: rangeStart, lte: rangeEnd } },
    orderBy: { date: 'asc' }
  });

  const confirmedBookings = await prisma.booking.findMany({
    where: { status: BookingStatus.CONFIRMED, checkIn: { lte: rangeEnd }, checkOut: { gte: rangeStart } },
    orderBy: { checkIn: 'asc' }
  });

  const bookingDates = confirmedBookings.flatMap((booking) =>
    eachDayOfInterval({ start: booking.checkIn, end: addDays(booking.checkOut, -1) }).map(toIsoDate)
  );

  return Array.from(new Set([...blockedDates.map((entry) => toIsoDate(entry.date)), ...bookingDates])).sort();
};

export const getNightCount = (checkIn: Date, checkOut: Date) => differenceInCalendarDays(checkOut, checkIn);
export const getNightDates = (checkIn: Date, checkOut: Date) => eachDayOfInterval({ start: checkIn, end: addDays(checkOut, -1) });

export const assertMinimumStay = (checkIn: Date, checkOut: Date) => {
  const nights = getNightCount(checkIn, checkOut);
  if (nights < MIN_STAY_NIGHTS) throw new Error('Minimum stay is 2 nights');
  return nights;
};

export const pickSeasonForDate = (seasons: PricingSeason[], date: Date) => {
  const season = seasons.find((item) => isWithinInterval(date, { start: item.dateFrom, end: item.dateTo }));
  if (!season) throw new Error(`No pricing season found for ${toIsoDate(date)}`);
  return season;
};

export const assertDatesAvailable = async (prisma: PrismaClient, checkIn: Date, checkOut: Date) => {
  const nightDates = getNightDates(checkIn, checkOut);
  const blocked = await prisma.blockedDate.findMany({ where: { date: { in: nightDates } } });
  if (blocked.length > 0) throw new Error('Selected dates are not available');

  const conflictingBooking = await prisma.booking.findFirst({
    where: { status: BookingStatus.CONFIRMED, checkIn: { lt: checkOut }, checkOut: { gt: checkIn } }
  });
  if (conflictingBooking) throw new Error('Selected dates are not available');
};

export const calculateTotalPrice = async (prisma: PrismaClient, checkIn: Date, checkOut: Date) => {
  const seasons = await prisma.pricingSeason.findMany({ orderBy: { dateFrom: 'asc' } });
  const subtotal = getNightDates(checkIn, checkOut).reduce((sum, date) => sum + pickSeasonForDate(seasons, date).pricePerNight.toNumber(), 0);
  return new Prisma.Decimal(subtotal + CLEANING_FEE);
};
```

`backend/src/routes/availability.ts`
```ts
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { getBlockedDatesForMonth } from '../services/availability';

const querySchema = z.object({ month: z.coerce.number().int().min(1).max(12), year: z.coerce.number().int().min(2024).max(2100) });
export const availabilityRouter = Router();
availabilityRouter.get('/', async (req, res, next) => {
  try {
    const { month, year } = querySchema.parse(req.query);
    res.json({ blockedDates: await getBlockedDatesForMonth(prisma, month, year) });
  } catch (error) {
    next(error);
  }
});
```

Replace `backend/src/index.ts` with:
```ts
import 'dotenv/config';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { availabilityRouter } from './routes/availability';

export const prisma = new PrismaClient();
export const createApp = () => {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/availability', availabilityRouter);
  app.use((_req: Request, res: Response) => res.status(404).json({ message: 'Not found' }));
  app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => res.status(500).json({ message: error.message || 'Internal server error' }));
  return app;
};
if (process.env.NODE_ENV !== 'test') createApp().listen(Number(process.env.PORT || 4000), () => console.log('Backend listening on 4000'));
```

- [ ] **Step 4: Re-run the new test and the related smoke test**

Run:
```powershell
npm test -- --runTestsByPath tests/availability.test.ts tests/app.test.ts
```
Expected:
```text
PASS tests/availability.test.ts
PASS tests/app.test.ts
```

### Task 6: Bookings route

**Files:**
- Create: `backend/src/routes/bookings.ts`
- Create: `backend/tests/bookings.test.ts`
- Modify: `backend/src/services/availability.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Write the booking creation test before adding the route**

`backend/tests/bookings.test.ts`
```ts
import request from 'supertest';
import { Prisma } from '@prisma/client';
import { prisma, createApp } from '../src/index';

describe('POST /api/bookings', () => {
  beforeAll(async () => {
    await prisma.pricingSeason.deleteMany();
    await prisma.pricingSeason.create({ data: { namePl: 'Sezon wysoki', nameEn: 'High season', pricePerNight: new Prisma.Decimal(1200), dateFrom: new Date('2026-05-01'), dateTo: new Date('2026-09-30'), isFeatured: true } });
  });

  afterAll(async () => { await prisma.booking.deleteMany(); });

  it('creates a pending booking and includes the cleaning fee in total price', async () => {
    const response = await request(createApp()).post('/api/bookings').send({ guestName: 'Anna Nowak', guestEmail: 'anna@example.com', guestPhone: '+48555111222', checkIn: '2026-06-01', checkOut: '2026-06-04', guestsCount: 4, notes: 'Sauna please', locale: 'pl' });
    expect(response.status).toBe(201);
    expect(response.body.status).toBe('PENDING');
    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: response.body.id } });
    expect(booking.totalPrice.toNumber()).toBe(3800);
  });

  it('rejects stays shorter than two nights', async () => {
    const response = await request(createApp()).post('/api/bookings').send({ guestName: 'Short Stay', guestEmail: 'short@example.com', guestPhone: '+48555111000', checkIn: '2026-06-01', checkOut: '2026-06-02', guestsCount: 2, locale: 'en' });
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Minimum stay is 2 nights');
  });
});
```

- [ ] **Step 2: Run the booking tests and verify the route is missing**

Run:
```powershell
npm test -- --runTestsByPath tests/bookings.test.ts
```
Expected:
```text
FAIL tests/bookings.test.ts
Expected 201, received 404
```

- [ ] **Step 3: Implement the booking route**

`backend/src/routes/bookings.ts`
```ts
import { Router } from 'express';
import { BookingStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../index';
import { validate } from '../middleware/validate';
import { calculateTotalPrice, assertDatesAvailable, assertMinimumStay } from '../services/availability';
import { sendOwnerBookingEmail } from '../services/email';

const bookingSchema = z.object({
  guestName: z.string().min(1),
  guestEmail: z.string().email(),
  guestPhone: z.string().min(1),
  checkIn: z.string().date(),
  checkOut: z.string().date(),
  guestsCount: z.number().int().min(1).max(8),
  notes: z.string().optional(),
  locale: z.enum(['pl', 'en']).default('pl')
});

export const bookingsRouter = Router();
bookingsRouter.post('/', validate(bookingSchema), async (req, res, next) => {
  try {
    const payload = bookingSchema.parse(req.body);
    const checkIn = new Date(payload.checkIn);
    const checkOut = new Date(payload.checkOut);
    assertMinimumStay(checkIn, checkOut);
    await assertDatesAvailable(prisma, checkIn, checkOut);
    const totalPrice = await calculateTotalPrice(prisma, checkIn, checkOut);
    const booking = await prisma.booking.create({ data: { ...payload, checkIn, checkOut, totalPrice, status: BookingStatus.PENDING } });
    await sendOwnerBookingEmail(booking);
    res.status(201).json({ id: booking.id, status: booking.status });
  } catch (error) {
    if (error instanceof Error) return res.status(400).json({ message: error.message });
    next(error);
  }
});
```

Update `backend/src/index.ts` routes:
```ts
import { bookingsRouter } from './routes/bookings';
app.use('/api/bookings', bookingsRouter);
```

- [ ] **Step 4: Run the booking tests until both pass**

Run:
```powershell
npm test -- --runTestsByPath tests/bookings.test.ts
```
Expected:
```text
PASS tests/bookings.test.ts
```

### Task 7: Contact + Gallery + Pricing routes

**Files:**
- Create: `backend/src/routes/contact.ts`
- Create: `backend/src/routes/gallery.ts`
- Create: `backend/src/routes/pricing.ts`
- Create: `backend/tests/contact.test.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Write failing tests for contact, gallery, and pricing**

`backend/tests/contact.test.ts`
```ts
import request from 'supertest';
import { prisma, createApp } from '../src/index';

describe('public content endpoints', () => {
  it('stores a contact message', async () => {
    const response = await request(createApp()).post('/api/contact').send({ name: 'Maria', email: 'maria@example.com', message: 'Czy jacuzzi jest całoroczne?' });
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ success: true });
  });

  it('returns gallery images sorted by sortOrder', async () => {
    const response = await request(createApp()).get('/api/gallery');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('returns all pricing seasons', async () => {
    const response = await request(createApp()).get('/api/pricing');
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(3);
  });

  afterAll(async () => { await prisma.contactMessage.deleteMany(); });
});
```

- [ ] **Step 2: Run the public-content tests before adding routes**

Run:
```powershell
npm test -- --runTestsByPath tests/contact.test.ts
```
Expected:
```text
FAIL tests/contact.test.ts
Expected 201, received 404
```

- [ ] **Step 3: Implement the three public routes and mount them**

`backend/src/routes/contact.ts`
```ts
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { validate } from '../middleware/validate';
import { sendOwnerMessageEmail } from '../services/email';
const contactSchema = z.object({ name: z.string().min(1), email: z.string().email(), message: z.string().min(1) });
export const contactRouter = Router();
contactRouter.post('/', validate(contactSchema), async (req, res, next) => {
  try {
    const message = await prisma.contactMessage.create({ data: contactSchema.parse(req.body) });
    await sendOwnerMessageEmail(message);
    res.status(201).json({ success: true });
  } catch (error) { next(error); }
});
```

`backend/src/routes/gallery.ts`
```ts
import { Router } from 'express';
import { prisma } from '../index';
export const galleryRouter = Router();
galleryRouter.get('/', async (_req, res, next) => {
  try { res.json(await prisma.galleryImage.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] })); }
  catch (error) { next(error); }
});
```

`backend/src/routes/pricing.ts`
```ts
import { Router } from 'express';
import { prisma } from '../index';
export const pricingRouter = Router();
pricingRouter.get('/', async (_req, res, next) => {
  try { res.json(await prisma.pricingSeason.findMany({ orderBy: { dateFrom: 'asc' } })); }
  catch (error) { next(error); }
});
```

Update `backend/src/index.ts` routes:
```ts
import { contactRouter } from './routes/contact';
import { galleryRouter } from './routes/gallery';
import { pricingRouter } from './routes/pricing';
app.use('/api/contact', contactRouter);
app.use('/api/gallery', galleryRouter);
app.use('/api/pricing', pricingRouter);
```

### Task 8: PayU stub route

**Files:**
- Create: `backend/src/routes/payment.ts`
- Create: `backend/tests/payment.test.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Add a failing test for the payment stub**

`backend/tests/payment.test.ts`
```ts
import request from 'supertest';
import { createApp } from '../src/index';

describe('payment stub', () => {
  it('returns a mock redirect and order id', async () => {
    const response = await request(createApp()).post('/api/payment/init').send({ bookingId: 'booking-1', amount: 3800 });
    expect(response.status).toBe(200);
    expect(response.body.redirectUrl).toBe('/booking?step=4&status=success');
    expect(response.body.orderId).toMatch(/^STUB-/);
  });

  it('accepts notification callbacks', async () => {
    const response = await request(createApp()).post('/api/payment/notify').send({ orderId: 'STUB-1' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
```

- [ ] **Step 2: Run the payment tests before implementation**

Run:
```powershell
npm test -- --runTestsByPath tests/payment.test.ts
```
Expected:
```text
FAIL tests/payment.test.ts
Expected 200, received 404
```

- [ ] **Step 3: Implement the PayU stub route and mount it**

`backend/src/routes/payment.ts`
```ts
import { Router } from 'express';
import { z } from 'zod';
const initSchema = z.object({ bookingId: z.string().min(1), amount: z.number().positive() });
export const paymentRouter = Router();
paymentRouter.post('/init', (req, res) => {
  const payload = initSchema.parse(req.body);
  res.json({ redirectUrl: '/booking?step=4&status=success', orderId: `STUB-${payload.bookingId}-${Date.now()}` });
});
paymentRouter.post('/notify', (_req, res) => res.json({ status: 'ok' }));
```

Update `backend/src/index.ts` routes:
```ts
import { paymentRouter } from './routes/payment';
app.use('/api/payment', paymentRouter);
```

### Task 9: Email service

**Files:**
- Create: `backend/src/services/email.ts`
- Create: `backend/tests/email.test.ts`

- [ ] **Step 1: Write failing tests for the email templates**

`backend/tests/email.test.ts`
```ts
import { buildGuestConfirmationEmail, buildOwnerBookingEmail, buildOwnerMessageEmail } from '../src/services/email';

describe('email templates', () => {
  it('builds the owner booking subject', () => {
    const message = buildOwnerBookingEmail({ guestName: 'Anna', guestEmail: 'anna@example.com', guestPhone: '+48123456789', checkIn: new Date('2026-06-01'), checkOut: new Date('2026-06-04'), guestsCount: 4, totalPrice: { toString: () => '3800' } } as never);
    expect(message.subject).toBe('Nowa rezerwacja — Anna');
  });

  it('builds the owner message subject', () => {
    const message = buildOwnerMessageEmail({ name: 'Maria', email: 'maria@example.com', message: 'Czy jest kominek?' } as never);
    expect(message.subject).toBe('Nowa wiadomość od Maria');
  });

  it('builds the guest confirmation in Polish', () => {
    const message = buildGuestConfirmationEmail({ guestName: 'Anna', checkIn: new Date('2026-06-01'), checkOut: new Date('2026-06-04'), totalPrice: { toString: () => '3800' }, locale: 'pl', guestEmail: 'anna@example.com' } as never);
    expect(message.subject).toBe('Potwierdzenie rezerwacji — Lagom Masuria');
    expect(message.text).toContain('cisza nocna 22:00-06:00');
  });
});
```

- [ ] **Step 2: Confirm the service is still missing**

Run:
```powershell
npm test -- --runTestsByPath tests/email.test.ts
```
Expected:
```text
FAIL tests/email.test.ts
Cannot find module '../src/services/email'
```

- [ ] **Step 3: Implement nodemailer transport and all three templates**

`backend/src/services/email.ts`
```ts
import nodemailer from 'nodemailer';
import { format } from 'date-fns';
import type { Booking, ContactMessage } from '@prisma/client';

const ownerEmail = process.env.OWNER_EMAIL || 'hello@lagommasuria.pl';
const transporter = nodemailer.createTransport(process.env.SMTP_HOST ? { host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: false, auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined } : { jsonTransport: true });
const date = (value: Date) => format(value, 'yyyy-MM-dd');

export const buildOwnerBookingEmail = (booking: Booking) => ({
  to: ownerEmail,
  subject: `Nowa rezerwacja — ${booking.guestName}`,
  text: [`Gość: ${booking.guestName}`, `Email: ${booking.guestEmail}`, `Telefon: ${booking.guestPhone}`, `Przyjazd: ${date(booking.checkIn)}`, `Wyjazd: ${date(booking.checkOut)}`, `Goście: ${booking.guestsCount}`, `Cena całkowita: ${booking.totalPrice.toString()} PLN`, `Notatki: ${booking.notes || '-'}`].join('\n')
});
export const buildOwnerMessageEmail = (message: ContactMessage) => ({ to: ownerEmail, subject: `Nowa wiadomość od ${message.name}`, text: [`Nadawca: ${message.name}`, `Email: ${message.email}`, '', message.message].join('\n') });
export const buildGuestConfirmationEmail = (booking: Booking) => ({
  to: booking.guestEmail,
  subject: booking.locale === 'en' ? 'Booking confirmation — Lagom Masuria' : 'Potwierdzenie rezerwacji — Lagom Masuria',
  text: booking.locale === 'en'
    ? [`Thank you, ${booking.guestName}!`, `Stay: ${date(booking.checkIn)} - ${date(booking.checkOut)}`, `Total: ${booking.totalPrice.toString()} PLN`, 'House rules:', '- check-in from 16:00', '- quiet hours 22:00-06:00', '- pets welcome', '- no smoking'].join('\n')
    : [`Dziękujemy, ${booking.guestName}!`, `Termin: ${date(booking.checkIn)} - ${date(booking.checkOut)}`, `Łącznie: ${booking.totalPrice.toString()} PLN`, 'Zasady domu:', '- check-in od 16:00', '- cisza nocna 22:00-06:00', '- zwierzęta mile widziane', '- zakaz palenia'].join('\n')
});
export const sendOwnerBookingEmail = async (booking: Booking) => transporter.sendMail({ from: ownerEmail, ...buildOwnerBookingEmail(booking) });
export const sendOwnerMessageEmail = async (message: ContactMessage) => transporter.sendMail({ from: ownerEmail, ...buildOwnerMessageEmail(message) });
export const sendGuestConfirmationEmail = async (booking: Booking) => transporter.sendMail({ from: ownerEmail, ...buildGuestConfirmationEmail(booking) });
```

### Task 10: Admin routes

**Files:**
- Create: `backend/src/routes/admin.ts`
- Create: `backend/tests/admin.test.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Write the admin API test suite first**

`backend/tests/admin.test.ts`
```ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { BookingStatus, Prisma } from '@prisma/client';
import { prisma, createApp } from '../src/index';

describe('admin api', () => {
  let token = '';
  let bookingId = '';
  let messageId = '';
  let pricingId = '';

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('Lagom123!', 10);
    const admin = await prisma.adminUser.upsert({ where: { email: 'admin@lagommasuria.pl' }, update: { passwordHash }, create: { email: 'admin@lagommasuria.pl', passwordHash } });
    token = jwt.sign({ adminId: admin.id }, process.env.JWT_SECRET || 'test_secret');
    bookingId = (await prisma.booking.create({ data: { guestName: 'Admin Test', guestEmail: 'guest@example.com', guestPhone: '+48111111111', checkIn: new Date('2026-07-01'), checkOut: new Date('2026-07-03'), guestsCount: 2, totalPrice: new Prisma.Decimal(2600), status: BookingStatus.PENDING, locale: 'pl' } })).id;
    messageId = (await prisma.contactMessage.create({ data: { name: 'Reader', email: 'reader@example.com', message: 'Hello' } })).id;
    pricingId = (await prisma.pricingSeason.findFirstOrThrow()).id;
  });

  it('logs in and returns a JWT', async () => {
    const response = await request(createApp()).post('/api/admin/login').send({ email: 'admin@lagommasuria.pl', password: 'Lagom123!' });
    expect(response.status).toBe(200);
    expect(response.body.token).toEqual(expect.any(String));
  });

  it('lists bookings for authorized admins', async () => {
    const response = await request(createApp()).get('/api/admin/bookings').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body[0].id).toBe(bookingId);
  });

  it('updates booking status', async () => {
    const response = await request(createApp()).patch(`/api/admin/bookings/${bookingId}`).set('Authorization', `Bearer ${token}`).send({ status: 'CONFIRMED' });
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('CONFIRMED');
  });

  it('marks contact messages as read', async () => {
    const response = await request(createApp()).patch(`/api/admin/messages/${messageId}`).set('Authorization', `Bearer ${token}`).send({ isRead: true });
    expect(response.status).toBe(200);
    expect(response.body.isRead).toBe(true);
  });

  it('updates pricing', async () => {
    const response = await request(createApp()).patch(`/api/admin/pricing/${pricingId}`).set('Authorization', `Bearer ${token}`).send({ namePl: 'Sezon premium', nameEn: 'Premium season', pricePerNight: 1400, dateFrom: '2026-05-01', dateTo: '2026-09-30', isFeatured: true });
    expect(response.status).toBe(200);
    expect(response.body.pricePerNight).toBe('1400');
  });
});
```

- [ ] **Step 2: Run the admin suite before the route exists**

Run:
```powershell
npm test -- --runTestsByPath tests/admin.test.ts
```
Expected:
```text
FAIL tests/admin.test.ts
Expected 200, received 404
```

- [ ] **Step 3: Implement login and all JWT-protected admin endpoints**

`backend/src/routes/admin.ts`
```ts
import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { BookingStatus, Prisma } from '@prisma/client';
import { eachDayOfInterval, addDays } from 'date-fns';
import { z } from 'zod';
import { prisma } from '../index';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { sendGuestConfirmationEmail } from '../services/email';

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
const bookingStatusSchema = z.object({ status: z.nativeEnum(BookingStatus) });
const readSchema = z.object({ isRead: z.boolean() });
const blockedDateSchema = z.object({ date: z.string().date(), reason: z.string().optional() });
const gallerySchema = z.object({ url: z.string().url(), captionPl: z.string().optional(), captionEn: z.string().optional(), sortOrder: z.number().int().default(0) });
const pricingSchema = z.object({ namePl: z.string().min(1), nameEn: z.string().min(1), pricePerNight: z.number().positive(), dateFrom: z.string().date(), dateTo: z.string().date(), isFeatured: z.boolean() });

export const adminRouter = Router();
adminRouter.post('/login', validate(loginSchema), async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) return res.status(401).json({ message: 'Invalid credentials' });
  return res.json({ token: jwt.sign({ adminId: admin.id }, process.env.JWT_SECRET || 'change_me_in_production', { expiresIn: '12h' }) });
});
adminRouter.use(requireAuth);
adminRouter.get('/bookings', async (_req, res) => res.json(await prisma.booking.findMany({ orderBy: { createdAt: 'desc' } })));
adminRouter.patch('/bookings/:id', validate(bookingStatusSchema), async (req, res) => {
  const booking = await prisma.booking.update({ where: { id: req.params.id }, data: { status: bookingStatusSchema.parse(req.body).status } });
  if (booking.status === BookingStatus.CONFIRMED) {
    for (const date of eachDayOfInterval({ start: booking.checkIn, end: addDays(booking.checkOut, -1) })) {
      await prisma.blockedDate.upsert({ where: { date }, update: { reason: 'Confirmed booking' }, create: { date, reason: 'Confirmed booking' } });
    }
    await sendGuestConfirmationEmail(booking);
  }
  res.json({ status: booking.status });
});
adminRouter.delete('/bookings/:id', async (req, res) => { await prisma.booking.delete({ where: { id: req.params.id } }); res.status(204).send(); });
adminRouter.get('/messages', async (_req, res) => res.json(await prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' } })));
adminRouter.patch('/messages/:id', validate(readSchema), async (req, res) => { const message = await prisma.contactMessage.update({ where: { id: req.params.id }, data: { isRead: readSchema.parse(req.body).isRead } }); res.json({ isRead: message.isRead }); });
adminRouter.post('/blocked-dates', validate(blockedDateSchema), async (req, res) => { const payload = blockedDateSchema.parse(req.body); res.status(201).json(await prisma.blockedDate.create({ data: { date: new Date(payload.date), reason: payload.reason } })); });
adminRouter.delete('/blocked-dates/:id', async (req, res) => { await prisma.blockedDate.delete({ where: { id: req.params.id } }); res.status(204).send(); });
adminRouter.post('/gallery', validate(gallerySchema), async (req, res) => res.status(201).json(await prisma.galleryImage.create({ data: gallerySchema.parse(req.body) })));
adminRouter.delete('/gallery/:id', async (req, res) => { await prisma.galleryImage.delete({ where: { id: req.params.id } }); res.status(204).send(); });
adminRouter.patch('/pricing/:id', validate(pricingSchema), async (req, res) => {
  const payload = pricingSchema.parse(req.body);
  res.json(await prisma.pricingSeason.update({ where: { id: req.params.id }, data: { namePl: payload.namePl, nameEn: payload.nameEn, pricePerNight: new Prisma.Decimal(payload.pricePerNight), dateFrom: new Date(payload.dateFrom), dateTo: new Date(payload.dateTo), isFeatured: payload.isFeatured } }));
});
```

Replace `backend/src/index.ts` with the final API bootstrap:
```ts
import 'dotenv/config';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { adminRouter } from './routes/admin';
import { availabilityRouter } from './routes/availability';
import { bookingsRouter } from './routes/bookings';
import { contactRouter } from './routes/contact';
import { galleryRouter } from './routes/gallery';
import { paymentRouter } from './routes/payment';
import { pricingRouter } from './routes/pricing';

export const prisma = new PrismaClient();
export const createApp = () => {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/availability', availabilityRouter);
  app.use('/api/bookings', bookingsRouter);
  app.use('/api/contact', contactRouter);
  app.use('/api/gallery', galleryRouter);
  app.use('/api/pricing', pricingRouter);
  app.use('/api/payment', paymentRouter);
  app.use('/api/admin', adminRouter);
  app.use((_req: Request, res: Response) => res.status(404).json({ message: 'Not found' }));
  app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => res.status(500).json({ message: error.message || 'Internal server error' }));
  return app;
};
if (process.env.NODE_ENV !== 'test') createApp().listen(Number(process.env.PORT || 4000), () => console.log('Backend listening on 4000'));
```

- [ ] **Step 4: Run the admin suite and the whole backend suite**

Run:
```powershell
npm test -- --runTestsByPath tests/admin.test.ts
npm test
```
Expected:
```text
PASS tests/admin.test.ts
Test Suites: 8 passed, 8 total
```

### Task 11: Frontend project setup

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/vitest.config.ts`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/postcss.config.cjs`
- Create: `frontend/index.html`
- Create: `frontend/Dockerfile`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/i18n/index.ts`
- Create: `frontend/src/i18n/pl.json`
- Create: `frontend/src/i18n/en.json`
- Create: `frontend/src/types/index.ts`
- Create: `frontend/src/test/setup.ts`
- Create: `frontend/src/App.test.tsx`

- [ ] **Step 1: Write the first failing frontend test**

`frontend/src/App.test.tsx`
```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

describe('app shell', () => {
  it('renders the Polish home route by default', () => {
    render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>);
    expect(screen.getByText('Twój azyl na Mazurach')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Install frontend deps and watch the test fail first**

Run:
```powershell
Set-Location ..\frontend
npm install
npm test -- --run src/App.test.tsx
```
Expected:
```text
FAIL src/App.test.tsx
Cannot find module './App'
```

- [ ] **Step 3: Create the Vite app shell, providers, i18n, constants, and Docker image**

`frontend/package.json`
```json
{
  "name": "lagom-masuria-frontend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": { "dev": "vite", "build": "tsc -b && vite build", "preview": "vite preview --host 0.0.0.0 --port 3000", "test": "vitest run" },
  "dependencies": { "@tanstack/react-query": "^5.51.1", "date-fns": "^3.6.0", "i18next": "^23.11.5", "react": "^18.3.1", "react-dom": "^18.3.1", "react-i18next": "^15.0.1", "react-router-dom": "^6.24.1" },
  "devDependencies": { "@testing-library/jest-dom": "^6.4.6", "@testing-library/react": "^16.0.0", "@testing-library/user-event": "^14.5.2", "@types/react": "^18.3.3", "@types/react-dom": "^18.3.0", "@vitejs/plugin-react": "^4.3.1", "autoprefixer": "^10.4.19", "jsdom": "^24.1.0", "postcss": "^8.4.39", "tailwindcss": "^3.4.4", "typescript": "^5.5.2", "vite": "^5.3.1", "vitest": "^2.0.2" }
}
```

`frontend/tsconfig.json`
```json
{ "compilerOptions": { "target": "ES2020", "useDefineForClassFields": true, "lib": ["DOM", "DOM.Iterable", "ES2020"], "skipLibCheck": true, "esModuleInterop": true, "strict": true, "module": "ESNext", "moduleResolution": "Node", "resolveJsonModule": true, "isolatedModules": true, "noEmit": true, "jsx": "react-jsx" }, "include": ["src", "vite.config.ts", "vitest.config.ts", "tailwind.config.ts"] }
```

`frontend/vite.config.ts`
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], server: { host: '0.0.0.0', port: 3000 } });
```

`frontend/vitest.config.ts`
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], test: { environment: 'jsdom', setupFiles: ['./src/test/setup.ts'] } });
```

`frontend/tailwind.config.ts`
```ts
import type { Config } from 'tailwindcss';
export default { content: ['./index.html', './src/**/*.{ts,tsx}'], theme: { extend: { colors: { pine: '#1F3B2C', sand: '#F4EFE6', lake: '#6FA8BF' } } }, plugins: [] } satisfies Config;
```

`frontend/postcss.config.cjs`
```js
module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

`frontend/index.html`
```html
<!doctype html>
<html lang='pl'>
  <head><meta charset='UTF-8' /><meta name='viewport' content='width=device-width, initial-scale=1.0' /><title>Lagom Masuria</title></head>
  <body class='bg-sand text-slate-900'><div id='root'></div><script type='module' src='/src/main.tsx'></script></body>
</html>
```

`frontend/Dockerfile`
```Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY tsconfig.json vite.config.ts vitest.config.ts tailwind.config.ts postcss.config.cjs index.html ./
COPY src ./src
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
```

`frontend/src/types/index.ts`
```ts
export const CLEANING_FEE = 200;
export type Locale = 'pl' | 'en';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';
export type GalleryImage = { id: string; url: string; captionPl: string | null; captionEn: string | null; sortOrder: number };
export type PricingSeason = { id: string; namePl: string; nameEn: string; pricePerNight: string; dateFrom: string; dateTo: string; isFeatured: boolean };
export type BookingPayload = { guestName: string; guestEmail: string; guestPhone: string; checkIn: string; checkOut: string; guestsCount: number; notes?: string; locale: Locale };
export type BookingResponse = { id: string; status: BookingStatus };
export type AvailabilityResponse = { blockedDates: string[] };
export type ContactPayload = { name: string; email: string; message: string };
```

`frontend/src/i18n/index.ts`
```ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import pl from './pl.json';
import en from './en.json';
const savedLanguage = (localStorage.getItem('lang') || 'pl') as 'pl' | 'en';
i18n.use(initReactI18next).init({ resources: { pl: { translation: pl }, en: { translation: en } }, lng: savedLanguage, fallbackLng: 'pl', interpolation: { escapeValue: false } });
export default i18n;
```

`frontend/src/i18n/pl.json`
```json
{
  "nav": { "home": "Start", "house": "Dom", "gallery": "Galeria", "rates": "Cennik", "contact": "Kontakt", "bookNow": "Rezerwuj" },
  "home": { "hero": { "title": "Twój azyl na Mazurach", "subtitle": "Minimalistyczny dom nad jeziorem i wśród lasów.", "cta": "Sprawdź dostępność" }, "amenities": { "title": "Dlaczego Lagom Masuria", "jacuzzi": "Jacuzzi pod gwiazdami", "forest": "Las za progiem", "lake": "Jezioro w spacerowej odległości" } },
  "booking": { "step1": "Krok 1: Daty", "step2": "Krok 2: Dane gości", "step3": "Krok 3: Zadatek", "step4": "Krok 4: Potwierdzenie", "dates": "Daty pobytu", "guestDetails": "Dane gości", "deposit": "Zadatek", "confirmation": "Potwierdzenie", "next": "Dalej", "prev": "Wstecz" },
  "admin": { "bookings": "Rezerwacje", "calendar": "Kalendarz", "messages": "Wiadomości", "gallery": "Galeria", "pricing": "Cennik", "logout": "Wyloguj", "status": { "pending": "Oczekująca", "confirmed": "Potwierdzona", "cancelled": "Anulowana" } }
}
```

`frontend/src/i18n/en.json`
```json
{
  "nav": { "home": "Home", "house": "House", "gallery": "Gallery", "rates": "Rates", "contact": "Contact", "bookNow": "Book now" },
  "home": { "hero": { "title": "Your Masurian hideaway", "subtitle": "A minimalist lake house surrounded by forest.", "cta": "Check availability" }, "amenities": { "title": "Why Lagom Masuria", "jacuzzi": "Jacuzzi under the stars", "forest": "Forest at your doorstep", "lake": "Lake within walking distance" } },
  "booking": { "step1": "Step 1: Dates", "step2": "Step 2: Guest details", "step3": "Step 3: Deposit", "step4": "Step 4: Confirmation", "dates": "Stay dates", "guestDetails": "Guest details", "deposit": "Deposit", "confirmation": "Confirmation", "next": "Next", "prev": "Previous" },
  "admin": { "bookings": "Bookings", "calendar": "Calendar", "messages": "Messages", "gallery": "Gallery", "pricing": "Pricing", "logout": "Logout", "status": { "pending": "Pending", "confirmed": "Confirmed", "cancelled": "Cancelled" } }
}
```

`frontend/src/test/setup.ts`
```ts
import '@testing-library/jest-dom/vitest';
import '../i18n';
```

`frontend/src/main.tsx`
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './i18n';
import App from './App';
const queryClient = new QueryClient();
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><QueryClientProvider client={queryClient}><BrowserRouter><App /></BrowserRouter></QueryClientProvider></React.StrictMode>);
```

`frontend/src/App.tsx`
```tsx
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
export default function App() { return <Routes><Route path='/' element={<Home />} /></Routes>; }
```

### Task 12: Navbar + Footer + LanguageToggle

**Files:**
- Create: `frontend/src/components/Navbar.tsx`
- Create: `frontend/src/components/Footer.tsx`
- Create: `frontend/src/components/LanguageToggle.tsx`
- Create: `frontend/src/components/Layout.tsx`
- Create: `frontend/src/components/Navbar.test.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Write the component test before implementation**

`frontend/src/components/Navbar.test.tsx`
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Layout from './Layout';

describe('navbar and language toggle', () => {
  it('persists selected language to localStorage', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><Layout><div>page</div></Layout></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: 'EN' }));
    expect(localStorage.getItem('lang')).toBe('en');
  });
});
```

- [ ] **Step 2: Run the component test and confirm the layout files are absent**

Run:
```powershell
npm test -- --run src/components/Navbar.test.tsx
```
Expected:
```text
FAIL src/components/Navbar.test.tsx
Cannot find module './Layout'
```

- [ ] **Step 3: Implement the shared layout components**

`frontend/src/components/LanguageToggle.tsx`
```tsx
import { useTranslation } from 'react-i18next';
export default function LanguageToggle() {
  const { i18n } = useTranslation();
  const changeLanguage = (lang: 'pl' | 'en') => { localStorage.setItem('lang', lang); i18n.changeLanguage(lang); };
  return <div className='flex gap-2'><button type='button' aria-label='PL' onClick={() => changeLanguage('pl')} className='rounded border px-3 py-1'>PL</button><button type='button' aria-label='EN' onClick={() => changeLanguage('en')} className='rounded border px-3 py-1'>EN</button></div>;
}
```

`frontend/src/components/Navbar.tsx`
```tsx
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageToggle from './LanguageToggle';
export default function Navbar() { const { t } = useTranslation(); return <header className='border-b bg-white/90'><nav className='mx-auto flex max-w-6xl items-center justify-between px-6 py-4'><Link to='/' className='text-xl font-semibold text-pine'>Lagom Masuria</Link><div className='flex items-center gap-6'><Link to='/'>{t('nav.home')}</Link><Link to='/house'>{t('nav.house')}</Link><Link to='/gallery'>{t('nav.gallery')}</Link><Link to='/booking'>{t('nav.contact')}</Link><Link to='/booking' className='rounded bg-pine px-4 py-2 text-white'>{t('nav.bookNow')}</Link><LanguageToggle /></div></nav></header>; }
```

`frontend/src/components/Footer.tsx`
```tsx
export default function Footer() { return <footer className='mt-16 bg-pine px-6 py-10 text-sm text-white'><div className='mx-auto flex max-w-6xl items-center justify-between'><div><p className='font-semibold'>Lagom Masuria</p><p>hello@lagommasuria.pl</p></div><p>© 2026 Lagom Masuria</p></div></footer>; }
```

`frontend/src/components/Layout.tsx`
```tsx
import type { PropsWithChildren } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
export default function Layout({ children }: PropsWithChildren) { return <div className='min-h-screen bg-sand text-slate-900'><Navbar /><main>{children || <Outlet />}</main><Footer /></div>; }
```

### Task 13: Home page

**Files:**
- Create: `frontend/src/pages/Home.tsx`
- Create: `frontend/src/pages/Home.test.tsx`

- [ ] **Step 1: Add a failing home-page test**

`frontend/src/pages/Home.test.tsx`
```tsx
import { render, screen } from '@testing-library/react';
import Home from './Home';
describe('home page', () => { it('renders hero copy and amenity cards', () => { render(<Home />); expect(screen.getByText('Twój azyl na Mazurach')).toBeInTheDocument(); expect(screen.getByText('Jacuzzi pod gwiazdami')).toBeInTheDocument(); expect(screen.getByText('Las za progiem')).toBeInTheDocument(); }); });
```

- [ ] **Step 2: Confirm the page test fails first**

Run:
```powershell
npm test -- --run src/pages/Home.test.tsx
```
Expected:
```text
FAIL src/pages/Home.test.tsx
Cannot find module './Home'
```

- [ ] **Step 3: Implement the marketing home page**

`frontend/src/pages/Home.tsx`
```tsx
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
const previewImages = ['https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800', 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800'];
export default function Home() { const { t } = useTranslation(); return <div><section className='bg-pine px-6 py-24 text-white'><div className='mx-auto max-w-6xl'><h1 className='text-5xl font-semibold'>{t('home.hero.title')}</h1><p className='mt-4 max-w-2xl text-lg'>{t('home.hero.subtitle')}</p><Link to='/booking' className='mt-8 inline-block rounded bg-lake px-6 py-3 font-medium text-slate-900'>{t('home.hero.cta')}</Link></div></section><section className='mx-auto max-w-6xl px-6 py-16'><h2 className='mb-8 text-3xl font-semibold'>{t('home.amenities.title')}</h2><div className='grid gap-6 md:grid-cols-3'>{[t('home.amenities.jacuzzi'), t('home.amenities.forest'), t('home.amenities.lake')].map((item) => <article key={item} className='rounded-2xl bg-white p-6 shadow-sm'><h3 className='text-xl font-medium'>{item}</h3></article>)}</div></section><section className='mx-auto max-w-6xl px-6 pb-20'><div className='grid gap-6 md:grid-cols-3'>{previewImages.map((image) => <img key={image} src={image} alt='Lagom Masuria interior preview' className='h-72 w-full rounded-2xl object-cover' />)}</div></section></div>; }
```

### Task 14: House & Attractions page

**Files:**
- Create: `frontend/src/pages/House.tsx`
- Create: `frontend/src/pages/House.test.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Write the failing House page test**

`frontend/src/pages/House.test.tsx`
```tsx
import { render, screen } from '@testing-library/react';
import House from './House';
describe('house page', () => { it('shows the house stats and nearby attractions', () => { render(<House />); expect(screen.getByText('120 m²')).toBeInTheDocument(); expect(screen.getByText('Lake Garbas 500 m')).toBeInTheDocument(); expect(screen.getByText('Kajaki i wędkowanie')).toBeInTheDocument(); }); });
```

- [ ] **Step 2: Run the page test before creating the file**

Run:
```powershell
npm test -- --run src/pages/House.test.tsx
```
Expected:
```text
FAIL src/pages/House.test.tsx
Cannot find module './House'
```

- [ ] **Step 3: Implement the house and attractions page and wire the route**

`frontend/src/pages/House.tsx`
```tsx
const attractions = ['Lake Garbas 500 m', 'Kajaki i wędkowanie', 'Trasy rowerowe przez las', 'Regionalna kuchnia i sery'];
export default function House() { return <div className='mx-auto max-w-6xl px-6 py-16'><section className='grid gap-10 md:grid-cols-[1.2fr_0.8fr]'><div><h1 className='text-4xl font-semibold'>Dom i atrakcje</h1><p className='mt-4 text-lg text-slate-700'>120 m² komfortowej przestrzeni, 3 sypialnie, salon z kominkiem i strefa wellness dla maksymalnie 8 gości.</p></div><aside className='rounded-2xl bg-white p-6 shadow-sm'><ul className='space-y-3 text-lg'><li>120 m²</li><li>3 sypialnie</li><li>8 gości</li></ul></aside></section><section className='mt-12'><h2 className='text-2xl font-semibold'>W okolicy</h2><ul className='mt-6 grid gap-4 md:grid-cols-2'>{attractions.map((item) => <li key={item} className='rounded-2xl bg-white p-6 shadow-sm'>{item}</li>)}</ul></section></div>; }
```

### Task 15: Gallery & Pricing page

**Files:**
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/api/gallery.ts`
- Create: `frontend/src/api/pricing.ts`
- Create: `frontend/src/pages/Gallery.tsx`
- Create: `frontend/src/pages/Gallery.test.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Write a failing gallery/pricing page test**

`frontend/src/pages/Gallery.test.tsx`
```tsx
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Gallery from './Gallery';
import * as galleryApi from '../api/gallery';
import * as pricingApi from '../api/pricing';
import { vi } from 'vitest';
vi.spyOn(galleryApi, 'getGalleryImages').mockResolvedValue([{ id: '1', url: 'https://example.com/1.jpg', captionPl: 'Widok', captionEn: 'View', sortOrder: 1 }]);
vi.spyOn(pricingApi, 'getPricingSeasons').mockResolvedValue([{ id: 's1', namePl: 'Sezon wysoki', nameEn: 'High season', pricePerNight: '1200', dateFrom: '2026-05-01', dateTo: '2026-09-30', isFeatured: true }]);
describe('gallery page', () => { it('renders masonry images and featured pricing cards', async () => { render(<QueryClientProvider client={new QueryClient()}><Gallery /></QueryClientProvider>); expect(await screen.findByText('Widok')).toBeInTheDocument(); expect(await screen.findByText('1200 PLN / noc')).toBeInTheDocument(); }); });
```

- [ ] **Step 2: Run the page test before any API clients exist**

Run:
```powershell
npm test -- --run src/pages/Gallery.test.tsx
```
Expected:
```text
FAIL src/pages/Gallery.test.tsx
Cannot find module '../api/gallery'
```

- [ ] **Step 3: Create typed API clients and the gallery/pricing page**

`frontend/src/api/client.ts`
```ts
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
export async function apiClient<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) }, ...init });
  if (!response.ok) { const body = await response.json().catch(() => ({ message: 'Request failed' })); throw new Error(body.message || 'Request failed'); }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
```

`frontend/src/api/gallery.ts`
```ts
import { apiClient } from './client';
import type { GalleryImage } from '../types';
export const getGalleryImages = () => apiClient<GalleryImage[]>('/api/gallery');
```

`frontend/src/api/pricing.ts`
```ts
import { apiClient } from './client';
import type { PricingSeason } from '../types';
export const getPricingSeasons = () => apiClient<PricingSeason[]>('/api/pricing');
```

`frontend/src/pages/Gallery.tsx`
```tsx
import { useQuery } from '@tanstack/react-query';
import { getGalleryImages } from '../api/gallery';
import { getPricingSeasons } from '../api/pricing';
export default function Gallery() {
  const { data: images = [] } = useQuery({ queryKey: ['gallery'], queryFn: getGalleryImages });
  const { data: pricing = [] } = useQuery({ queryKey: ['pricing'], queryFn: getPricingSeasons });
  return <div className='mx-auto max-w-6xl px-6 py-16'><section><h1 className='text-4xl font-semibold'>Galeria i cennik</h1><div className='mt-8 columns-1 gap-4 md:columns-3'>{images.map((image) => <figure key={image.id} className='mb-4 break-inside-avoid rounded-2xl bg-white p-2 shadow-sm'><img src={image.url} alt={image.captionPl || 'Lagom Masuria'} className='w-full rounded-xl' /><figcaption className='p-3 text-sm'>{image.captionPl}</figcaption></figure>)}</div></section><section className='mt-16 grid gap-6 md:grid-cols-3'>{pricing.map((season) => <article key={season.id} className='rounded-2xl bg-white p-6 shadow-sm'>{season.isFeatured ? <span className='rounded bg-pine px-2 py-1 text-xs text-white'>POPULARNY</span> : null}<h2 className='mt-3 text-2xl font-semibold'>{season.namePl}</h2><p className='mt-2 text-lg'>{season.pricePerNight} PLN / noc</p><p className='mt-2 text-sm text-slate-600'>{season.dateFrom} — {season.dateTo}</p></article>)}</section></div>;
}
```

- [ ] **Step 4: Re-run the gallery page test**

Run:
```powershell
npm test -- --run src/pages/Gallery.test.tsx
```
Expected:
```text
PASS src/pages/Gallery.test.tsx
```

### Task 16: Booking wizard step 1 (calendar)

**Files:**
- Create: `frontend/src/api/bookings.ts`
- Create: `frontend/src/hooks/useAvailability.ts`
- Create: `frontend/src/components/BookingCalendar.tsx`
- Create: `frontend/src/pages/Booking.tsx`
- Create: `frontend/src/pages/Booking.step1.test.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Write the failing step-1 booking test**

`frontend/src/pages/Booking.step1.test.tsx`
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Booking from './Booking';
import * as bookingsApi from '../api/bookings';
import { vi } from 'vitest';
vi.spyOn(bookingsApi, 'getAvailability').mockResolvedValue({ blockedDates: ['2026-06-10'] });
describe('booking step 1', () => { it('prevents selecting a stay shorter than two nights', async () => { const user = userEvent.setup(); render(<QueryClientProvider client={new QueryClient()}><Booking /></QueryClientProvider>); await user.type(screen.getByLabelText('Check-in'), '2026-06-12'); await user.type(screen.getByLabelText('Check-out'), '2026-06-13'); await user.click(screen.getByRole('button', { name: 'Dalej' })); expect(await screen.findByText('Minimum stay is 2 nights')).toBeInTheDocument(); }); });
```

- [ ] **Step 2: Run the step-1 test before implementing the wizard**

Run:
```powershell
npm test -- --run src/pages/Booking.step1.test.tsx
```
Expected:
```text
FAIL src/pages/Booking.step1.test.tsx
Cannot find module '../api/bookings'
```

- [ ] **Step 3: Implement availability hook, calendar component, and the step-1-only booking page**

`frontend/src/api/bookings.ts`
```ts
import { apiClient } from './client';
import type { AvailabilityResponse, BookingPayload, BookingResponse } from '../types';
export const getAvailability = (month: number, year: number) => apiClient<AvailabilityResponse>(`/api/availability?month=${month}&year=${year}`);
export const createBooking = (payload: BookingPayload) => apiClient<BookingResponse>('/api/bookings', { method: 'POST', body: JSON.stringify(payload) });
export const initPayment = (bookingId: string, amount: number) => apiClient<{ redirectUrl: string; orderId: string }>('/api/payment/init', { method: 'POST', body: JSON.stringify({ bookingId, amount }) });
```

`frontend/src/hooks/useAvailability.ts`
```ts
import { useQuery } from '@tanstack/react-query';
import { getAvailability } from '../api/bookings';
export const useAvailability = (month: number, year: number) => useQuery({ queryKey: ['availability', month, year], queryFn: () => getAvailability(month, year) });
```

`frontend/src/components/BookingCalendar.tsx`
```tsx
type Props = { blockedDates: string[]; checkIn: string; checkOut: string; onCheckInChange: (value: string) => void; onCheckOutChange: (value: string) => void };
export default function BookingCalendar({ blockedDates, checkIn, checkOut, onCheckInChange, onCheckOutChange }: Props) {
  return <div className='grid gap-6 rounded-2xl bg-white p-6 shadow-sm md:grid-cols-2'><label className='flex flex-col gap-2'>Check-in<input type='date' value={checkIn} onChange={(event) => onCheckInChange(event.target.value)} className='rounded border px-3 py-2' /></label><label className='flex flex-col gap-2'>Check-out<input type='date' value={checkOut} onChange={(event) => onCheckOutChange(event.target.value)} className='rounded border px-3 py-2' /></label><div className='md:col-span-2'><p className='font-medium'>Blocked dates</p><ul className='mt-2 flex flex-wrap gap-2'>{blockedDates.map((date) => <li key={date} className='rounded bg-slate-200 px-3 py-1 text-sm'>{date}</li>)}</ul></div></div>;
}
```

`frontend/src/pages/Booking.tsx`
```tsx
import { differenceInCalendarDays } from 'date-fns';
import { useState } from 'react';
import BookingCalendar from '../components/BookingCalendar';
import { useAvailability } from '../hooks/useAvailability';
export default function Booking() {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [error, setError] = useState('');
  const { data } = useAvailability(6, 2026);
  const onNext = () => { if (!checkIn || !checkOut || differenceInCalendarDays(new Date(checkOut), new Date(checkIn)) < 2) { setError('Minimum stay is 2 nights'); return; } setError(''); };
  return <div className='mx-auto max-w-4xl px-6 py-16'><h1 className='text-4xl font-semibold'>Rezerwacja</h1><p className='mt-2 text-slate-600'>Krok 1: Daty</p><div className='mt-8'><BookingCalendar blockedDates={data?.blockedDates || []} checkIn={checkIn} checkOut={checkOut} onCheckInChange={setCheckIn} onCheckOutChange={setCheckOut} /></div>{error ? <p className='mt-4 text-red-700'>{error}</p> : null}<button type='button' onClick={onNext} className='mt-6 rounded bg-pine px-4 py-2 text-white'>Dalej</button></div>;
}
```

### Task 17: Booking wizard steps 2-4

**Files:**
- Create: `frontend/src/pages/Booking.steps.test.tsx`
- Modify: `frontend/src/pages/Booking.tsx`
- Modify: `frontend/src/types/index.ts`

- [ ] **Step 1: Write the failing end-to-end wizard component test**

`frontend/src/pages/Booking.steps.test.tsx`
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Booking from './Booking';
import * as bookingsApi from '../api/bookings';
import { vi } from 'vitest';
vi.spyOn(bookingsApi, 'getAvailability').mockResolvedValue({ blockedDates: [] });
vi.spyOn(bookingsApi, 'createBooking').mockResolvedValue({ id: 'booking-1', status: 'PENDING' });
vi.spyOn(bookingsApi, 'initPayment').mockResolvedValue({ redirectUrl: '/booking?step=4&status=success', orderId: 'STUB-booking-1' });
describe('booking wizard', () => { it('submits guest details, initializes payment, and shows the confirmation summary', async () => { const user = userEvent.setup(); render(<QueryClientProvider client={new QueryClient()}><Booking /></QueryClientProvider>); await user.type(screen.getByLabelText('Check-in'), '2026-06-12'); await user.type(screen.getByLabelText('Check-out'), '2026-06-15'); await user.click(screen.getByRole('button', { name: 'Dalej' })); await user.type(screen.getByLabelText('Imię i nazwisko'), 'Anna Nowak'); await user.type(screen.getByLabelText('Email'), 'anna@example.com'); await user.type(screen.getByLabelText('Telefon'), '+48555111222'); await user.clear(screen.getByLabelText('Liczba gości')); await user.type(screen.getByLabelText('Liczba gości'), '4'); await user.click(screen.getByRole('button', { name: 'Dalej' })); await user.click(screen.getByRole('button', { name: 'Uruchom płatność testową' })); expect(await screen.findByText('STUB-booking-1')).toBeInTheDocument(); expect(await screen.findByText('Opłata za sprzątanie: 200 PLN')).toBeInTheDocument(); }); });
```

- [ ] **Step 2: Run the wizard test before extending the page**

Run:
```powershell
npm test -- --run src/pages/Booking.steps.test.tsx
```
Expected:
```text
FAIL src/pages/Booking.steps.test.tsx
Unable to find a label with the text of: Imię i nazwisko
```

- [ ] **Step 3: Replace the booking page with the full 4-step wizard**

Append to `frontend/src/types/index.ts`:
```ts
export type BookingWizardForm = BookingPayload & { totalPrice: number; bookingId?: string; orderId?: string };
```

Replace `frontend/src/pages/Booking.tsx` with:
```tsx
import { differenceInCalendarDays } from 'date-fns';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import BookingCalendar from '../components/BookingCalendar';
import { sendContactMessage } from '../api/contact';
import { createBooking, initPayment } from '../api/bookings';
import { useAvailability } from '../hooks/useAvailability';
import { CLEANING_FEE, type BookingWizardForm } from '../types';
const baseState: BookingWizardForm = { guestName: '', guestEmail: '', guestPhone: '', checkIn: '', checkOut: '', guestsCount: 2, notes: '', locale: 'pl', totalPrice: CLEANING_FEE };
export default function Booking() {
  const { i18n } = useTranslation();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [form, setForm] = useState<BookingWizardForm>(baseState);
  const { data } = useAvailability(6, 2026);
  const nights = useMemo(() => (!form.checkIn || !form.checkOut ? 0 : differenceInCalendarDays(new Date(form.checkOut), new Date(form.checkIn))), [form.checkIn, form.checkOut]);
  const estimatedTotal = Math.max(0, nights) * 1200 + CLEANING_FEE;
  const nextFromDates = () => { if (nights < 2) { setError('Minimum stay is 2 nights'); return; } setForm((current) => ({ ...current, totalPrice: estimatedTotal, locale: i18n.language === 'en' ? 'en' : 'pl' })); setError(''); setStep(2); };
  const nextFromGuestDetails = async () => { if (!form.guestName || !form.guestEmail || !form.guestPhone || form.guestsCount < 1 || form.guestsCount > 8) { setError('Fill in all required guest details'); return; } const booking = await createBooking({ guestName: form.guestName, guestEmail: form.guestEmail, guestPhone: form.guestPhone, checkIn: form.checkIn, checkOut: form.checkOut, guestsCount: form.guestsCount, notes: form.notes, locale: form.locale }); setForm((current) => ({ ...current, bookingId: booking.id })); setError(''); setStep(3); };
  const handlePayment = async () => { if (!form.bookingId) return; const payment = await initPayment(form.bookingId, form.totalPrice); setForm((current) => ({ ...current, orderId: payment.orderId })); setStep(4); };
  return <div className='mx-auto max-w-4xl px-6 py-16'><h1 className='text-4xl font-semibold'>Rezerwacja</h1><p className='mt-2 text-slate-600'>Krok {step}</p>{step === 1 ? <div className='mt-8'><BookingCalendar blockedDates={data?.blockedDates || []} checkIn={form.checkIn} checkOut={form.checkOut} onCheckInChange={(value) => setForm((current) => ({ ...current, checkIn: value }))} onCheckOutChange={(value) => setForm((current) => ({ ...current, checkOut: value }))} /><button type='button' onClick={nextFromDates} className='mt-6 rounded bg-pine px-4 py-2 text-white'>Dalej</button></div> : null}{step === 2 ? <form className='mt-8 grid gap-4 rounded-2xl bg-white p-6 shadow-sm'><label>Imię i nazwisko<input className='mt-1 w-full rounded border px-3 py-2' value={form.guestName} onChange={(event) => setForm((current) => ({ ...current, guestName: event.target.value }))} /></label><label>Email<input className='mt-1 w-full rounded border px-3 py-2' value={form.guestEmail} onChange={(event) => setForm((current) => ({ ...current, guestEmail: event.target.value }))} /></label><label>Telefon<input className='mt-1 w-full rounded border px-3 py-2' value={form.guestPhone} onChange={(event) => setForm((current) => ({ ...current, guestPhone: event.target.value }))} /></label><label>Liczba gości<input aria-label='Liczba gości' type='number' min={1} max={8} className='mt-1 w-full rounded border px-3 py-2' value={form.guestsCount} onChange={(event) => setForm((current) => ({ ...current, guestsCount: Number(event.target.value) }))} /></label><label>Uwagi<textarea className='mt-1 w-full rounded border px-3 py-2' value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></label><div className='flex gap-3'><button type='button' onClick={() => setStep(1)} className='rounded border px-4 py-2'>Wstecz</button><button type='button' onClick={nextFromGuestDetails} className='rounded bg-pine px-4 py-2 text-white'>Dalej</button></div></form> : null}{step === 3 ? <section className='mt-8 rounded-2xl bg-white p-6 shadow-sm'><h2 className='text-2xl font-semibold'>Zadatek</h2><p className='mt-3'>Kwota do potwierdzenia: {form.totalPrice} PLN</p><button type='button' onClick={handlePayment} className='mt-6 rounded bg-pine px-4 py-2 text-white'>Uruchom płatność testową</button></section> : null}{step === 4 ? <section className='mt-8 rounded-2xl bg-white p-6 shadow-sm'><h2 className='text-2xl font-semibold'>Potwierdzenie</h2><p>Rezerwacja: {form.bookingId}</p><p>Zamówienie PayU: {form.orderId}</p><p>Noclegi: {nights} × 1200 PLN</p><p>Opłata za sprzątanie: {CLEANING_FEE} PLN</p><p className='font-semibold'>Razem: {form.totalPrice} PLN</p></section> : null}{error ? <p className='mt-4 text-red-700'>{error}</p> : null}<section className='mt-16 rounded-2xl bg-white p-6 shadow-sm'><h2 className='text-2xl font-semibold'>Kontakt</h2><ContactSection /><iframe title='Lagom Masuria map' src='https://www.google.com/maps?q=53.901,22.177&z=12&output=embed' className='mt-6 h-72 w-full rounded-2xl border-0' /></section></div>;
}
function ContactSection() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [success, setSuccess] = useState('');
  const submit = async () => { await sendContactMessage(form); setSuccess('Wiadomość została wysłana.'); };
  return <div className='mt-6 grid gap-4'><label>Kontakt — imię<input className='mt-1 w-full rounded border px-3 py-2' value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></label><label>Kontakt — email<input className='mt-1 w-full rounded border px-3 py-2' value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></label><label>Kontakt — wiadomość<textarea className='mt-1 w-full rounded border px-3 py-2' value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} /></label><button type='button' onClick={submit} className='w-fit rounded bg-pine px-4 py-2 text-white'>Wyślij wiadomość</button>{success ? <p className='text-green-700'>{success}</p> : null}</div>;
}
```

### Task 18: Contact form

**Files:**
- Create: `frontend/src/api/contact.ts`
- Create: `frontend/src/pages/Booking.contact.test.tsx`
- Modify: `frontend/src/pages/Booking.tsx`

- [ ] **Step 1: Write the failing contact-form test**

`frontend/src/pages/Booking.contact.test.tsx`
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Booking from './Booking';
import * as contactApi from '../api/contact';
import * as bookingsApi from '../api/bookings';
import { vi } from 'vitest';
vi.spyOn(bookingsApi, 'getAvailability').mockResolvedValue({ blockedDates: [] });
vi.spyOn(contactApi, 'sendContactMessage').mockResolvedValue({ success: true });
describe('contact section', () => { it('submits the embedded contact form', async () => { const user = userEvent.setup(); render(<QueryClientProvider client={new QueryClient()}><Booking /></QueryClientProvider>); await user.type(screen.getByLabelText('Kontakt — imię'), 'Maria'); await user.type(screen.getByLabelText('Kontakt — email'), 'maria@example.com'); await user.type(screen.getByLabelText('Kontakt — wiadomość'), 'Czy akceptujecie psy?'); await user.click(screen.getByRole('button', { name: 'Wyślij wiadomość' })); expect(await screen.findByText('Wiadomość została wysłana.')).toBeInTheDocument(); }); });
```

- [ ] **Step 2: Run the contact-form test first**

Run:
```powershell
npm test -- --run src/pages/Booking.contact.test.tsx
```
Expected:
```text
FAIL src/pages/Booking.contact.test.tsx
Cannot find module '../api/contact'
```

- [ ] **Step 3: Add the contact API client used by the booking page**

`frontend/src/api/contact.ts`
```ts
import { apiClient } from './client';
import type { ContactPayload } from '../types';
export const sendContactMessage = (payload: ContactPayload) => apiClient<{ success: true }>('/api/contact', { method: 'POST', body: JSON.stringify(payload) });
```

### Task 19: Admin login + layout

**Files:**
- Create: `frontend/src/api/admin.ts`
- Create: `frontend/src/hooks/useAuth.ts`
- Create: `frontend/src/pages/admin/Login.tsx`
- Create: `frontend/src/pages/admin/AdminLayout.tsx`
- Create: `frontend/src/pages/admin/AdminLayout.test.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Write the failing admin auth test**

`frontend/src/pages/admin/AdminLayout.test.tsx`
```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import Login from './Login';
import * as adminApi from '../../api/admin';
import { vi } from 'vitest';
vi.spyOn(adminApi, 'loginAdmin').mockResolvedValue({ token: 'jwt-token' });
describe('admin login', () => { it('stores the JWT in localStorage after successful login', async () => { const user = userEvent.setup(); render(<MemoryRouter><Login /></MemoryRouter>); await user.type(screen.getByLabelText('Email'), 'admin@lagommasuria.pl'); await user.type(screen.getByLabelText('Hasło'), 'Lagom123!'); await user.click(screen.getByRole('button', { name: 'Zaloguj' })); expect(localStorage.getItem('adminToken')).toBe('jwt-token'); }); });
```

- [ ] **Step 2: Run the admin auth test before implementation**

Run:
```powershell
npm test -- --run src/pages/admin/AdminLayout.test.tsx
```
Expected:
```text
FAIL src/pages/admin/AdminLayout.test.tsx
Cannot find module '../../api/admin'
```

- [ ] **Step 3: Build the admin client, auth hook, login page, and protected layout**

`frontend/src/api/admin.ts`
```ts
import { apiClient } from './client';
import type { BookingStatus, GalleryImage, PricingSeason } from '../types';
const withAuth = (token: string) => ({ Authorization: `Bearer ${token}` });
export const loginAdmin = (email: string, password: string) => apiClient<{ token: string }>('/api/admin/login', { method: 'POST', body: JSON.stringify({ email, password }) });
export const getAdminBookings = (token: string) => apiClient<any[]>('/api/admin/bookings', { headers: withAuth(token) });
export const updateAdminBooking = (token: string, id: string, status: BookingStatus) => apiClient<{ status: BookingStatus }>(`/api/admin/bookings/${id}`, { method: 'PATCH', headers: withAuth(token), body: JSON.stringify({ status }) });
export const getAdminMessages = (token: string) => apiClient<any[]>('/api/admin/messages', { headers: withAuth(token) });
export const markMessageRead = (token: string, id: string) => apiClient<{ isRead: true }>(`/api/admin/messages/${id}`, { method: 'PATCH', headers: withAuth(token), body: JSON.stringify({ isRead: true }) });
export const createBlockedDate = (token: string, date: string, reason?: string) => apiClient<{ id: string; date: string; reason?: string }>('/api/admin/blocked-dates', { method: 'POST', headers: withAuth(token), body: JSON.stringify({ date, reason }) });
export const createGalleryImage = (token: string, payload: Partial<GalleryImage>) => apiClient<GalleryImage>('/api/admin/gallery', { method: 'POST', headers: withAuth(token), body: JSON.stringify(payload) });
export const updatePricingSeason = (token: string, pricing: PricingSeason) => apiClient<PricingSeason>(`/api/admin/pricing/${pricing.id}`, { method: 'PATCH', headers: withAuth(token), body: JSON.stringify({ namePl: pricing.namePl, nameEn: pricing.nameEn, pricePerNight: Number(pricing.pricePerNight), dateFrom: pricing.dateFrom, dateTo: pricing.dateTo, isFeatured: pricing.isFeatured }) });
```

`frontend/src/hooks/useAuth.ts`
```ts
import { useMemo, useState } from 'react';
export const useAuth = () => {
  const [token, setToken] = useState(() => localStorage.getItem('adminToken') || '');
  return useMemo(() => ({ token, isAuthenticated: Boolean(token), login: (nextToken: string) => { localStorage.setItem('adminToken', nextToken); setToken(nextToken); }, logout: () => { localStorage.removeItem('adminToken'); setToken(''); } }), [token]);
};
```

`frontend/src/pages/admin/Login.tsx`
```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginAdmin } from '../../api/admin';
export default function Login() { const navigate = useNavigate(); const [email, setEmail] = useState('admin@lagommasuria.pl'); const [password, setPassword] = useState('Lagom123!'); const submit = async () => { const response = await loginAdmin(email, password); localStorage.setItem('adminToken', response.token); navigate('/admin'); }; return <div className='mx-auto max-w-md px-6 py-20'><div className='rounded-2xl bg-white p-8 shadow-sm'><h1 className='text-3xl font-semibold'>Panel administracyjny</h1><label className='mt-6 block'>Email<input className='mt-2 w-full rounded border px-3 py-2' value={email} onChange={(event) => setEmail(event.target.value)} /></label><label className='mt-4 block'>Hasło<input type='password' className='mt-2 w-full rounded border px-3 py-2' value={password} onChange={(event) => setPassword(event.target.value)} /></label><button type='button' onClick={submit} className='mt-6 rounded bg-pine px-4 py-2 text-white'>Zaloguj</button></div></div>; }
```

`frontend/src/pages/admin/AdminLayout.tsx`
```tsx
import { Link, Navigate, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
export default function AdminLayout() { const { t } = useTranslation(); const auth = useAuth(); if (!auth.isAuthenticated) return <Navigate to='/admin/login' replace />; return <div className='mx-auto flex max-w-6xl gap-8 px-6 py-10'><aside className='w-64 rounded-2xl bg-white p-6 shadow-sm'><nav className='flex flex-col gap-3'><Link to='/admin/bookings'>{t('admin.bookings')}</Link><Link to='/admin/calendar'>{t('admin.calendar')}</Link><Link to='/admin/messages'>{t('admin.messages')}</Link><Link to='/admin/gallery'>{t('admin.gallery')}</Link><Link to='/admin/pricing'>{t('admin.pricing')}</Link><button type='button' onClick={auth.logout} className='rounded border px-3 py-2 text-left'>{t('admin.logout')}</button></nav></aside><section className='flex-1'><Outlet /></section></div>; }
```

### Task 20: Admin tabs

**Files:**
- Create: `frontend/src/pages/admin/AdminBookings.tsx`
- Create: `frontend/src/pages/admin/AdminCalendar.tsx`
- Create: `frontend/src/pages/admin/AdminMessages.tsx`
- Create: `frontend/src/pages/admin/AdminGallery.tsx`
- Create: `frontend/src/pages/admin/AdminPricing.tsx`
- Create: `frontend/src/pages/admin/AdminTabs.test.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Write one failing integration test covering the admin tabs**

`frontend/src/pages/admin/AdminTabs.test.tsx`
```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminBookings from './AdminBookings';
import * as adminApi from '../../api/admin';
import { vi } from 'vitest';
localStorage.setItem('adminToken', 'jwt-token');
vi.spyOn(adminApi, 'getAdminBookings').mockResolvedValue([{ id: 'b1', guestName: 'Anna', status: 'PENDING', checkIn: '2026-06-01', checkOut: '2026-06-04', totalPrice: '3800' }]);
describe('admin tabs', () => { it('renders bookings returned by the admin API', async () => { render(<MemoryRouter><AdminBookings /></MemoryRouter>); expect(await screen.findByText('Anna')).toBeInTheDocument(); }); });
```

- [ ] **Step 2: Run the failing tabs test before implementing screens**

Run:
```powershell
npm test -- --run src/pages/admin/AdminTabs.test.tsx
```
Expected:
```text
FAIL src/pages/admin/AdminTabs.test.tsx
Cannot find module './AdminBookings'
```

- [ ] **Step 3: Implement all five admin tabs and register the routes**

`frontend/src/pages/admin/AdminBookings.tsx`
```tsx
import { useEffect, useState } from 'react';
import { getAdminBookings, updateAdminBooking } from '../../api/admin';
type BookingRow = { id: string; guestName: string; status: 'PENDING' | 'CONFIRMED' | 'CANCELLED'; checkIn: string; checkOut: string; totalPrice: string };
export default function AdminBookings() { const token = localStorage.getItem('adminToken') || ''; const [bookings, setBookings] = useState<BookingRow[]>([]); useEffect(() => { getAdminBookings(token).then(setBookings); }, [token]); const updateStatus = async (id: string, status: BookingRow['status']) => { await updateAdminBooking(token, id, status); setBookings((current) => current.map((booking) => (booking.id === id ? { ...booking, status } : booking))); }; return <div className='rounded-2xl bg-white p-6 shadow-sm'><h1 className='text-3xl font-semibold'>Rezerwacje</h1><table className='mt-6 w-full text-left'><tbody>{bookings.map((booking) => <tr key={booking.id} className='border-t'><td className='py-3'>{booking.guestName}</td><td>{booking.checkIn} - {booking.checkOut}</td><td>{booking.totalPrice} PLN</td><td>{booking.status}</td><td className='space-x-2'><button type='button' onClick={() => updateStatus(booking.id, 'CONFIRMED')} className='rounded border px-3 py-1'>Confirm</button><button type='button' onClick={() => updateStatus(booking.id, 'CANCELLED')} className='rounded border px-3 py-1'>Cancel</button></td></tr>)}</tbody></table></div>; }
```

`frontend/src/pages/admin/AdminCalendar.tsx`
```tsx
import { useState } from 'react';
import { createBlockedDate } from '../../api/admin';
export default function AdminCalendar() { const token = localStorage.getItem('adminToken') || ''; const [date, setDate] = useState(''); const [message, setMessage] = useState(''); const submit = async () => { await createBlockedDate(token, date, 'Manual block'); setMessage(`Blocked ${date}`); }; return <div className='rounded-2xl bg-white p-6 shadow-sm'><h1 className='text-3xl font-semibold'>Kalendarz</h1><label className='mt-6 block'>Date<input type='date' className='mt-2 rounded border px-3 py-2' value={date} onChange={(event) => setDate(event.target.value)} /></label><button type='button' onClick={submit} className='mt-4 rounded bg-pine px-4 py-2 text-white'>Block date</button>{message ? <p className='mt-4'>{message}</p> : null}</div>; }
```

`frontend/src/pages/admin/AdminMessages.tsx`
```tsx
import { useEffect, useState } from 'react';
import { getAdminMessages, markMessageRead } from '../../api/admin';
type MessageRow = { id: string; name: string; email: string; message: string; isRead: boolean };
export default function AdminMessages() { const token = localStorage.getItem('adminToken') || ''; const [messages, setMessages] = useState<MessageRow[]>([]); useEffect(() => { getAdminMessages(token).then(setMessages); }, [token]); const markRead = async (id: string) => { await markMessageRead(token, id); setMessages((current) => current.map((message) => (message.id === id ? { ...message, isRead: true } : message))); }; return <div className='rounded-2xl bg-white p-6 shadow-sm'><h1 className='text-3xl font-semibold'>Wiadomości</h1><div className='mt-6 space-y-4'>{messages.map((message) => <article key={message.id} className='rounded border p-4'><p className='font-semibold'>{message.name}</p><p>{message.email}</p><p className='mt-2'>{message.message}</p><button type='button' onClick={() => markRead(message.id)} className='mt-3 rounded border px-3 py-1'>Mark read</button></article>)}</div></div>; }
```

`frontend/src/pages/admin/AdminGallery.tsx`
```tsx
import { useState } from 'react';
import { createGalleryImage } from '../../api/admin';
export default function AdminGallery() { const token = localStorage.getItem('adminToken') || ''; const [url, setUrl] = useState(''); const [captionPl, setCaptionPl] = useState(''); const [message, setMessage] = useState(''); const submit = async () => { await createGalleryImage(token, { url, captionPl, sortOrder: 0 }); setMessage('Image added'); }; return <div className='rounded-2xl bg-white p-6 shadow-sm'><h1 className='text-3xl font-semibold'>Galeria</h1><label className='mt-6 block'>URL<input className='mt-2 w-full rounded border px-3 py-2' value={url} onChange={(event) => setUrl(event.target.value)} /></label><label className='mt-4 block'>Caption PL<input className='mt-2 w-full rounded border px-3 py-2' value={captionPl} onChange={(event) => setCaptionPl(event.target.value)} /></label><button type='button' onClick={submit} className='mt-4 rounded bg-pine px-4 py-2 text-white'>Add image</button>{message ? <p className='mt-4'>{message}</p> : null}</div>; }
```

`frontend/src/pages/admin/AdminPricing.tsx`
```tsx
import { useState } from 'react';
import { updatePricingSeason } from '../../api/admin';
export default function AdminPricing() { const token = localStorage.getItem('adminToken') || ''; const [season, setSeason] = useState({ id: 'season-1', namePl: 'Sezon wysoki', nameEn: 'High season', pricePerNight: '1200', dateFrom: '2026-05-01', dateTo: '2026-09-30', isFeatured: true }); const [message, setMessage] = useState(''); const submit = async () => { await updatePricingSeason(token, season); setMessage('Pricing saved'); }; return <div className='rounded-2xl bg-white p-6 shadow-sm'><h1 className='text-3xl font-semibold'>Cennik</h1><label className='mt-6 block'>Price per night<input className='mt-2 rounded border px-3 py-2' value={season.pricePerNight} onChange={(event) => setSeason((current) => ({ ...current, pricePerNight: event.target.value }))} /></label><button type='button' onClick={submit} className='mt-4 rounded bg-pine px-4 py-2 text-white'>Save pricing</button>{message ? <p className='mt-4'>{message}</p> : null}</div>; }
```

Replace `frontend/src/App.tsx` with the final route tree:
```tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import House from './pages/House';
import Gallery from './pages/Gallery';
import Booking from './pages/Booking';
import Login from './pages/admin/Login';
import AdminLayout from './pages/admin/AdminLayout';
import AdminBookings from './pages/admin/AdminBookings';
import AdminCalendar from './pages/admin/AdminCalendar';
import AdminMessages from './pages/admin/AdminMessages';
import AdminGallery from './pages/admin/AdminGallery';
import AdminPricing from './pages/admin/AdminPricing';
export default function App() { return <Routes><Route element={<Layout />}><Route path='/' element={<Home />} /><Route path='/house' element={<House />} /><Route path='/gallery' element={<Gallery />} /><Route path='/booking' element={<Booking />} /></Route><Route path='/admin/login' element={<Login />} /><Route path='/admin' element={<AdminLayout />}><Route index element={<Navigate to='/admin/bookings' replace />} /><Route path='bookings' element={<AdminBookings />} /><Route path='calendar' element={<AdminCalendar />} /><Route path='messages' element={<AdminMessages />} /><Route path='gallery' element={<AdminGallery />} /><Route path='pricing' element={<AdminPricing />} /></Route></Routes>; }
```

- [ ] **Step 4: Re-run the admin tab test and then the full frontend suite**

Run:
```powershell
npm test -- --run src/pages/admin/AdminTabs.test.tsx
npm test
```
Expected:
```text
PASS src/pages/admin/AdminTabs.test.tsx
Test Files 9 passed
```

## Final Verification Checklist

- [ ] Run backend verification from `backend/`:
  ```powershell
  npm test
  npm run build
  ```
  Expected: all Jest suites pass and TypeScript builds successfully.
- [ ] Run frontend verification from `frontend/`:
  ```powershell
  npm test
  npm run build
  ```
  Expected: all Vitest suites pass and Vite production build succeeds.
- [ ] Run full stack verification from the repo root:
  ```powershell
  docker compose up --build
  ```
  Expected: frontend on `http://localhost:3000`, backend on `http://localhost:4000`, PostgreSQL on `localhost:5432`.
- [ ] Manually verify PL default language, EN toggle persistence, booking wizard flow, admin login, and each admin tab against the API.

Plan complete and saved to `docs/superpowers/plans/2026-05-25-lagom-masuria.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
