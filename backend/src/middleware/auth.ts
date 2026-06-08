/* eslint-disable @typescript-eslint/no-namespace */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../utils/prisma';
import { AppError } from './errorHandler';
import { cache } from '../services/redis';

const PARTNER_CACHE_TTL = 60; // 1 minute

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
      partner?: {
        id: string;
        companyName: string;
        tier: string;
        walletAddress: string;
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
      const cacheKey = `partner:auth:${decoded.sub}`;
      const cached = await cache.get(cacheKey);

      if (cached) {
        req.partner = JSON.parse(cached);
      } else {
        const partner = await prisma.partner.findUnique({
          where: { id: decoded.sub },
        });

        if (!partner) {
          throw new AppError('Token references a non-existent account', 401, 'TOKEN_EXPIRED');
        }

        if (partner.status === 'BANNED') {
          throw new AppError('Account is banned', 401, 'ACCOUNT_INVALID');
        }

        const partnerData = {
          id: partner.id,
          companyName: partner.companyName,
          tier: partner.tier,
          walletAddress: partner.walletAddress,
        };
        await cache.set(cacheKey, JSON.stringify(partnerData), PARTNER_CACHE_TTL);
        req.partner = partnerData;
      }
    } else if (decoded.type === 'admin') {
      const admin = await prisma.admin.findUnique({
        where: { id: decoded.sub },
      });

      if (!admin) {
        throw new AppError('Token references a non-existent admin', 401, 'TOKEN_EXPIRED');
      }

      if (!admin.isActive) {
        throw new AppError('Admin account is inactive', 401, 'ACCOUNT_INVALID');
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
  return jwt.sign(payload, config.jwt.secret as jwt.Secret, {
    expiresIn: config.jwt.expiresIn,
  } as jwt.SignOptions);
};

export const generateRefreshToken = (
  payload: Omit<JwtPayload, 'iat' | 'exp'>
): string => {
  return jwt.sign(payload, config.jwt.refreshSecret as jwt.Secret, {
    expiresIn: config.jwt.refreshExpiresIn,
  } as jwt.SignOptions);
};




