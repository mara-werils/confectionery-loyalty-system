import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../utils/prisma';
import { AppError } from './errorHandler';

export interface JwtPayload {
  sub: string;
  walletAddress: string;
  type: 'partner' | 'admin';
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        walletAddress: string;
        type: 'partner' | 'admin';
      };
    }
  }
}

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    // Verify user exists
    if (decoded.type === 'partner') {
      const partner = await prisma.partner.findUnique({
        where: { id: decoded.sub },
      });

      if (!partner || partner.status === 'BANNED') {
        throw new AppError('Account not found or banned', 401, 'ACCOUNT_INVALID');
      }
    } else if (decoded.type === 'admin') {
      const admin = await prisma.admin.findUnique({
        where: { id: decoded.sub },
      });

      if (!admin || !admin.isActive) {
        throw new AppError('Admin account not found or inactive', 401, 'ACCOUNT_INVALID');
      }
    }

    req.user = {
      id: decoded.sub,
      walletAddress: decoded.walletAddress,
      type: decoded.type,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const requirePartner = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user || req.user.type !== 'partner') {
    return next(new AppError('Partner access required', 403, 'FORBIDDEN'));
  }
  next();
};

export const requireAdmin = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user || req.user.type !== 'admin') {
    return next(new AppError('Admin access required', 403, 'FORBIDDEN'));
  }
  next();
};

export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];

      if (token) {
        const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
        req.user = {
          id: decoded.sub,
          walletAddress: decoded.walletAddress,
          type: decoded.type,
        };
      }
    }
    next();
  } catch {
    // Token invalid/expired, but continue without auth
    next();
  }
};

export const generateToken = (payload: Omit<JwtPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

export const generateRefreshToken = (
  payload: Omit<JwtPayload, 'iat' | 'exp'>
): string => {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
};




