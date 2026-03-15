import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { AppError } from './errorHandler';
import jwt from 'jsonwebtoken';
import { config } from '../config';

interface AdminJwtPayload {
    id: string;
    walletAddress: string;
    role: string;
    isAdmin: true;
}

declare global {
    namespace Express {
        interface Request {
            admin?: AdminJwtPayload;
        }
    }
}

/**
 * Middleware to verify admin authentication
 */
export const adminAuth = async (
    req: Request,
    _res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader?.startsWith('Bearer ')) {
            throw new AppError('No token provided', 401, 'NO_TOKEN');
        }

        const token = authHeader.substring(7);

        const decoded = jwt.verify(token, config.jwt.secret) as AdminJwtPayload;

        if (!decoded.isAdmin) {
            throw new AppError('Not an admin token', 403, 'NOT_ADMIN');
        }

        // Verify admin still exists and is active
        const admin = await prisma.admin.findUnique({
            where: { id: decoded.id },
        });

        if (!admin || !admin.isActive) {
            throw new AppError('Admin account not found or inactive', 403, 'ADMIN_INACTIVE');
        }

        req.admin = decoded;
        next();
    } catch (error) {
        if (error instanceof AppError) {
            next(error);
        } else if (error instanceof jwt.JsonWebTokenError) {
            next(new AppError('Invalid token', 401, 'INVALID_TOKEN'));
        } else {
            next(new AppError('Authentication failed', 401, 'AUTH_FAILED'));
        }
    }
};

/**
 * Middleware to require superadmin role
 */
export const superAdminOnly = (
    req: Request,
    _res: Response,
    next: NextFunction
): void => {
    if (req.admin?.role !== 'superadmin') {
        return next(new AppError('Superadmin access required', 403, 'SUPERADMIN_REQUIRED'));
    }
    next();
};

/**
 * Generate admin JWT token
 */
export const generateAdminToken = (admin: {
    id: string;
    walletAddress: string;
    role: string;
}): string => {
    return jwt.sign(
        {
            id: admin.id,
            walletAddress: admin.walletAddress,
            role: admin.role,
            isAdmin: true,
        },
        config.jwt.secret,
        { expiresIn: '8h' }
    );
};
