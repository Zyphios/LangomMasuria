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
  app.use('/api/contact', contactRouter);
  app.use('/api/gallery', galleryRouter);
  app.use('/api/pricing', pricingRouter);
  app.use('/api/payment', paymentRouter);
  app.use('/api/admin', adminRouter);

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
