import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { successResponse } from '../utils/response';
import { authenticate } from '../middleware/auth';
import { achievementService } from '../services/achievements';

const router = Router();

/**
 * Get all achievements with partner progress
 */
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const partnerId = req.partner!.id;
        const achievements = await achievementService.getPartnerAchievements(partnerId);

        // Group by category
        const grouped = achievements.reduce((acc, a) => {
            if (!acc[a.category]) acc[a.category] = [];
            acc[a.category].push(a);
            return acc;
        }, {} as Record<string, typeof achievements>);

        return successResponse(res, {
            achievements,
            byCategory: grouped,
            stats: {
                total: achievements.length,
                unlocked: achievements.filter(a => a.unlockedAt).length,
            },
        });
    } catch (error) {
        return next(error);
    }
});

/**
 * Check and update achievements
 */
router.post('/check', authenticate, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const partnerId = req.partner!.id;
        const unlocked = await achievementService.checkAchievements(partnerId);

        return successResponse(res, {
            newlyUnlocked: unlocked,
        }, unlocked.length > 0 ? 'New achievements unlocked!' : 'No new achievements');
    } catch (error) {
        return next(error);
    }
});

/**
 * Get achievement leaderboard
 */
router.get('/leaderboard', async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const leaderboard = await prisma.partnerAchievement.groupBy({
            by: ['partnerId'],
            where: { unlockedAt: { not: null } },
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 20,
        });

        // Fetch partner details
        const partnerIds = leaderboard.map(l => l.partnerId);
        const partners = await prisma.partner.findMany({
            where: { id: { in: partnerIds } },
            select: { id: true, companyName: true, tier: true },
        });

        const partnersMap = new Map(partners.map(p => [p.id, p]));

        return successResponse(res, leaderboard.map((l, i) => ({
            rank: i + 1,
            companyName: partnersMap.get(l.partnerId)?.companyName || 'Unknown',
            tier: partnersMap.get(l.partnerId)?.tier,
            achievementCount: l._count.id,
        })));
    } catch (error) {
        return next(error);
    }
});

export default router;
