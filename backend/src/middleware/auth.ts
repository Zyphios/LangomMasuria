import type { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthenticatedRequest, JwtPayload } from '../types';

export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const header = req.header('Authorization');
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const payload = jwt.verify(header.replace('Bearer ', ''), process.env.JWT_SECRET || 'test_secret') as JwtPayload;
    req.adminId = payload.adminId;
    return next();
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};
