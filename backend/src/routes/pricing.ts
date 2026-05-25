import { Router } from 'express';
import { prisma } from '../index';
export const pricingRouter = Router();
pricingRouter.get('/', async (_req, res, next) => {
  try { res.json(await prisma.pricingSeason.findMany({ orderBy: { dateFrom: 'asc' } })); }
  catch (error) { next(error); }
});
