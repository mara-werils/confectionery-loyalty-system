import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { successResponse } from '../utils/response';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { notificationService } from '../services/notification';
import { logger } from '../utils/logger';
import crypto from 'crypto';

const router = Router();

/**
 * Generate unique referral code
 */
const generateReferralCode = (): string => {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
};

/**
 * Get referral stats for current partner
 */
router.get('/stats', authenticate, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const partnerId = req.partner!.id;

        // Get partner with referral code
        const partner = await prisma.partner.findUnique({
            where: { id: partnerId },
            select: { referralCode: true },
        });

        // Count referrals
        const referralCount = await prisma.partner.count({
            where: { referredById: partnerId },
        });

        // Get referral list with earned points
        const referrals = await prisma.partner.findMany({
            where: { referredById: partnerId },
            select: {
                id: true,
                companyName: true,
                createdAt: true,
                tier: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        // Calculate total bonus earned from referrals
        const referralTransactions = await prisma.transaction.aggregate({
            where: {
                partnerId,
                type: 'REFERRAL',
            },
            _sum: { pointsEarned: true },
        });

        return successResponse(res, {
            referralCode: partner?.referralCode,
            totalReferrals: referralCount,
            totalBonusEarned: referralTransactions._sum.pointsEarned?.toString() || '0',
            referrals,
        });
    } catch (error) {
        return next(error);
    }
});

/**
 * Generate/get referral code
 */
router.post('/generate-code', authenticate, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const partnerId = req.partner!.id;

        // Check if already has code
        const partner = await prisma.partner.findUnique({
            where: { id: partnerId },
            select: { referralCode: true },
        });

        if (partner?.referralCode) {
            return successResponse(res, { referralCode: partner.referralCode });
        }

        // Generate new code
        let referralCode = generateReferralCode();
        let attempts = 0;

        // Ensure unique
        while (attempts < 10) {
            const exists = await prisma.partner.findUnique({
                where: { referralCode },
            });
            if (!exists) break;
            referralCode = generateReferralCode();
            attempts++;
        }

        // Save code
        const updated = await prisma.partner.update({
            where: { id: partnerId },
            data: { referralCode },
            select: { referralCode: true },
        });

        return successResponse(res, { referralCode: updated.referralCode }, 'Referral code generated');
    } catch (error) {
        return next(error);
    }
});

const applyReferralSchema = z.object({
    referralCode: z.string().min(1),
});

/**
 * Apply referral code (during registration or later)
 */
router.post('/apply', authenticate, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const partnerId = req.partner!.id;
        const { referralCode } = applyReferralSchema.parse(req.body);

        // Check if already has referrer
        const currentPartner = await prisma.partner.findUnique({
            where: { id: partnerId },
            select: { referredById: true },
        });

        if (currentPartner?.referredById) {
            throw new AppError('Referral already applied', 400, 'REFERRAL_ALREADY_APPLIED');
        }

        // Find referrer
        const referrer = await prisma.partner.findUnique({
            where: { referralCode },
            select: { id: true, companyName: true },
        });

        if (!referrer) {
            throw new AppError('Invalid referral code', 404, 'INVALID_REFERRAL_CODE');
        }

        if (referrer.id === partnerId) {
            throw new AppError('Cannot use own referral code', 400, 'SELF_REFERRAL');
        }

        // Apply referral
        await prisma.partner.update({
            where: { id: partnerId },
            data: { referredById: referrer.id },
        });

        // Award bonus to referrer (e.g., 500 points)
        const REFERRAL_BONUS = 500n;

        await prisma.$transaction([
            prisma.loyaltyPoints.upsert({
                where: { partnerId: referrer.id },
                update: {
                    balance: { increment: REFERRAL_BONUS },
                    lifetimeEarned: { increment: REFERRAL_BONUS },
                },
                create: {
                    partnerId: referrer.id,
                    balance: REFERRAL_BONUS,
                    lifetimeEarned: REFERRAL_BONUS,
                },
            }),
            prisma.transaction.create({
                data: {
                    partnerId: referrer.id,
                    amount: 0n,
                    pointsEarned: REFERRAL_BONUS,
                    type: 'REFERRAL',
                    description: `Referral bonus for inviting new partner`,
                },
            }),
        ]);

        // Notify referrer — fire-and-forget so it never blocks the response
        void notificationService.notifyReferralBonus(
            referrer.id,
            Number(REFERRAL_BONUS),
            req.partner!.companyName
        ).catch((err) => logger.warn('Referral notification failed:', err));

        return successResponse(res, { referrer: referrer.companyName }, 'Referral applied');
    } catch (error) {
        return next(error);
    }
});

/**
 * Get referral leaderboard
 */
router.get('/leaderboard', async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const leaderboard = await prisma.partner.findMany({
            where: {
                referrals: { some: {} },
            },
            select: {
                id: true,
                companyName: true,
                tier: true,
                _count: { select: { referrals: true } },
            },
            orderBy: {
                referrals: { _count: 'desc' },
            },
            take: 20,
        });

        return successResponse(res, leaderboard.map((p, i) => ({
            rank: i + 1,
            companyName: p.companyName,
            tier: p.tier,
            referralCount: p._count.referrals,
        })));
    } catch (error) {
        return next(error);
    }
});

export default router;
