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
