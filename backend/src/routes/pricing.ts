import { Router } from 'express';
import { prisma } from '../index';
import { BookingOperationError } from '../services/bookingTransaction';
export const pricingRouter = Router();
pricingRouter.get('/settings', async (_req, res, next) => {
  try {
    const settings = await prisma.pricingSettings.findUnique({ where: { id: 1 } });
    if (!settings) throw new BookingOperationError(503, 'PRICING_SETTINGS_UNAVAILABLE');
    res.json(settings);
  } catch (error) { next(error); }
});
pricingRouter.get('/', async (_req, res, next) => {
  try { res.json(await prisma.pricingSeason.findMany({ orderBy: { dateFrom: 'asc' } })); }
  catch (error) { next(error); }
});
