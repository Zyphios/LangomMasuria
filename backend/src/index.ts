import 'dotenv/config';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { availabilityRouter } from './routes/availability';
import { bookingsRouter } from './routes/bookings';
import { contactRouter } from './routes/contact';
import { galleryRouter } from './routes/gallery';
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
