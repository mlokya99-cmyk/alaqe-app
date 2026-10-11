import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'alaqe-telegram-style-secret-key-2026';

export interface AuthUser {
  id: number;
  phone: string;
  username: string | null;
  display_name: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function signToken(user: { id: number; phone: string; username: string | null; display_name: string }): string {
  return jwt.sign(
    {
      id: user.id,
      phone: user.phone,
      username: user.username,
      display_name: user.display_name,
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'كۈچكە ئىگە كىملىك تەلەپ قىلىنىدۇ (Unauthorized)' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'كىملىك ۋاقتى ئۆتكەن ياكى ئىناۋەتسىز (Invalid or expired token)' });
  }
}
