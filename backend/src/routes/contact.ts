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
