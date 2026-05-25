import { Router } from 'express';
import { z } from 'zod';
const initSchema = z.object({ bookingId: z.string().min(1), amount: z.number().positive() });
export const paymentRouter = Router();
paymentRouter.post('/init', (req, res) => {
  const payload = initSchema.parse(req.body);
  res.json({ redirectUrl: '/booking?step=4&status=success', orderId: `STUB-${payload.bookingId}-${Date.now()}` });
});
paymentRouter.post('/notify', (_req, res) => res.json({ status: 'ok' }));
