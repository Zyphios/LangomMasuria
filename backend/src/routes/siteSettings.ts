import { Router } from 'express';
import { prisma } from '../index';
import { BookingOperationError } from '../services/bookingTransaction';

export const socialLinkFields = { facebookUrl: true, instagramUrl: true } as const;
export const siteSettingsRouter = Router();

siteSettingsRouter.get('/', async (_req, res, next) => {
  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 1 }, select: socialLinkFields });
    if (!settings) throw new BookingOperationError(503, 'SITE_SETTINGS_UNAVAILABLE');
    res.json(settings);
  } catch (error) { next(error); }
});
