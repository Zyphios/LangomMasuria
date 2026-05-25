import { Router } from 'express';
import { prisma } from '../index';
export const galleryRouter = Router();
galleryRouter.get('/', async (_req, res, next) => {
  try { res.json(await prisma.galleryImage.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] })); }
  catch (error) { next(error); }
});
