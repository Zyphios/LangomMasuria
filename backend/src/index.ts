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
import { z } from 'zod';
import { bookingLinksRouter } from './routes/bookingLinks';
import { BookingOperationError } from './services/bookingTransaction';
import { bookingConfig } from './services/bookingLinks';
import { startBookingJobs } from './services/bookingJobs';

export const prisma = new PrismaClient();

export const createApp = () => {
  const app = express();
  app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : false);

  // All API responses are dynamic (booking/pricing/gallery data can change at any time), so
  // disable Express's automatic ETag generation and tell browsers never to cache them. Without
  // this, admin pages could silently show a stale 304-cached list after data changes server-side.
  app.disable('etag');
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  app.use(cors());
  app.use(express.json());
  app.use('/api/availability', availabilityRouter);
  app.use('/api/bookings', bookingsRouter);
  app.use('/api/booking-links', bookingLinksRouter);
  app.use('/api/contact', contactRouter);
  app.use('/api/gallery', galleryRouter);
  app.use('/api/pricing', pricingRouter);
  app.use('/api/payment', paymentRouter);
  app.use('/api/admin', adminRouter);

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ message: 'Not found' });
  });

  app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof BookingOperationError) {
      if (error.retryAfter) res.set('Retry-After', String(error.retryAfter));
      res.status(error.status).json({ message: error.message, code: error.code, retryAfter: error.retryAfter });
    } else if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Invalid input', issues: error.issues });
    } else {
      console.error('API operation failed:', error.name);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  return app;
};

if (process.env.NODE_ENV !== 'test') {
  bookingConfig();
  const app = createApp();
  const port = Number(process.env.PORT || 4000);
  const server = app.listen(port, () => {
    console.log(`Backend listening on ${port}`);
  });
  const jobs = startBookingJobs(prisma);
  let stopping = false;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    await jobs.stop();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await prisma.$disconnect();
  };
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => { void shutdown().catch(() => { console.error('Backend shutdown failed'); process.exitCode = 1; }); });
  }
}
