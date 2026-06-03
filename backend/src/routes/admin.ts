import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { successResponse, paginatedResponse } from '../utils/response';
import { adminAuth, superAdminOnly, generateAdminToken } from '../middleware/adminAuth';
import { AppError } from '../middleware/errorHandler';
import { verifyWalletSignature } from '../services/ton';
import { Address } from '@ton/ton';
import { logAction } from '../utils/auditLog';

const router = Router();

// ============================================================================
// ADMIN AUTH
// ============================================================================

const adminLoginSchema = z.object({
    walletAddress: z.string().min(1),
    signature: z.string(),
    message: z.string(),
});

/**
 * Admin login
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = adminLoginSchema.parse(req.body);

        // Find admin
        const admin = await prisma.admin.findUnique({
            where: { walletAddress: data.walletAddress },
        });

        if (!admin) {
            throw new AppError('Admin not found', 404, 'ADMIN_NOT_FOUND');
        }

        if (!admin.isActive) {
            throw new AppError('Admin account is inactive', 403, 'ADMIN_INACTIVE');
        }

        // Verify signature (simplified for now)
        const isValid = await verifyWalletSignature(
            data.walletAddress,
            data.message,
            data.signature
        );

        if (!isValid) {
            throw new AppError('Invalid signature', 401, 'INVALID_SIGNATURE');
        }

        // Update last login
        await prisma.admin.update({
            where: { id: admin.id },
            data: { lastLoginAt: new Date() },
        });

        const token = generateAdminToken(admin);

        return successResponse(res, { admin, token }, 'Login successful');
    } catch (error) {
        return next(error);
    }
});

/**
 * Admin email/password login (for web admin panel)
 */
router.post('/email-login', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@sweetloyalty.kz';
        const adminPassword = process.env.ADMIN_PASSWORD || 'MasterKey2026!';

        if (email !== adminEmail || password !== adminPassword) {
            throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
        }

        // Find or use first superadmin
        const admin = await prisma.admin.findFirst({ where: { role: 'superadmin', isActive: true } });
        if (!admin) {
            throw new AppError('No admin account configured', 500, 'NO_ADMIN');
        }

        await prisma.admin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
        const token = generateAdminToken(admin);

        return successResponse(res, { admin, token }, 'Login successful');
    } catch (error) {
        return next(error);
    }
});

// ============================================================================
// DASHBOARD STATS
// ============================================================================

/**
 * Get dashboard statistics
 */
router.get('/stats', adminAuth, async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const [
            totalPartners,
            pendingPartners,
            activePartners,
            totalTransactions,
            totalPointsIssued,
            recentTransactions,
        ] = await Promise.all([
            prisma.partner.count(),
            prisma.partner.count({ where: { status: 'PENDING' } }),
            prisma.partner.count({ where: { status: 'ACTIVE' } }),
            prisma.transaction.count(),
            prisma.loyaltyPoints.aggregate({ _sum: { lifetimeEarned: true } }),
            prisma.transaction.findMany({
                take: 10,
                orderBy: { createdAt: 'desc' },
                include: { partner: { select: { companyName: true } } },
            }),
        ]);

        return successResponse(res, {
            partners: {
                total: totalPartners,
                pending: pendingPartners,
                active: activePartners,
            },
            transactions: {
                total: totalTransactions,
            },
            points: {
                totalIssued: totalPointsIssued._sum.lifetimeEarned?.toString() || '0',
            },
            recentTransactions,
        });
    } catch (error) {
        return next(error);
    }
});

// ============================================================================
// PARTNER MANAGEMENT
// ============================================================================

/**
 * List all partners with filters
 */
router.get('/partners', adminAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const status = req.query.status as string;
        const tier = req.query.tier as string;
        const search = req.query.search as string;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = {};
        if (status) where.status = status;
        if (tier) where.tier = tier;
        if (search) {
            where.OR = [
                { companyName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { walletAddress: { contains: search } },
            ];
        }

        const [partners, total] = await Promise.all([
            prisma.partner.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: { loyaltyPoints: true },
            }),
            prisma.partner.count({ where }),
        ]);

        return paginatedResponse(res, partners, page, limit, total);
    } catch (error) {
        return next(error);
    }
});

/**
 * Get single partner details
 */
router.get('/partners/:id', adminAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const partner = await prisma.partner.findUnique({
            where: { id: req.params.id },
            include: {
                loyaltyPoints: true,
                transactions: { take: 20, orderBy: { createdAt: 'desc' } },
                claimedRewards: { include: { reward: true } },
            },
        });

        if (!partner) {
            throw new AppError('Partner not found', 404, 'NOT_FOUND');
        }

        return successResponse(res, partner);
    } catch (error) {
        return next(error);
    }
});

const updatePartnerSchema = z.object({
    status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'BANNED']).optional(),
    tier: z.enum(['BRONZE', 'SILVER', 'GOLD']).optional(),
});

/**
 * Update partner status/tier
 */
router.patch('/partners/:id', adminAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = updatePartnerSchema.parse(req.body);

        const partner = await prisma.partner.update({
            where: { id: req.params.id },
            data,
            include: { loyaltyPoints: true },
        });

        return successResponse(res, partner, 'Partner updated');
    } catch (error) {
        return next(error);
    }
});

/**
 * Approve partner
 */
router.post('/partners/:id/approve', adminAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const partner = await prisma.partner.update({
            where: { id: req.params.id },
            data: { status: 'ACTIVE' },
        });

        return successResponse(res, partner, 'Partner approved');
    } catch (error) {
        return next(error);
    }
});

/**
 * Ban partner
 */
router.post('/partners/:id/ban', adminAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const partner = await prisma.partner.update({
            where: { id: req.params.id },
            data: { status: 'BANNED' },
        });

        return successResponse(res, partner, 'Partner banned');
    } catch (error) {
        return next(error);
    }
});

// ============================================================================
// REWARD MANAGEMENT
// ============================================================================

/**
 * List all rewards
 */
router.get('/rewards', adminAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const rewards = await prisma.reward.findMany({
            orderBy: { createdAt: 'desc' },
        });

        return successResponse(res, rewards);
    } catch (error) {
        return next(error);
    }
});

const createRewardSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    pointsRequired: z.number().int().positive(),
    category: z.enum(['DISCOUNT', 'PRODUCT', 'CASHBACK', 'SPECIAL']),
    available: z.number().int().default(0),
    maxClaims: z.number().int().default(0),
    imageUrl: z.string().url().optional(),
    validFrom: z.string().datetime().optional(),
    validUntil: z.string().datetime().optional(),
});

/**
 * Create reward
 */
router.post('/rewards', adminAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = createRewardSchema.parse(req.body);

        const reward = await prisma.reward.create({
            data: {
                title: data.title,
                description: data.description,
                pointsRequired: BigInt(data.pointsRequired),
                category: data.category,
                imageUrl: data.imageUrl,
                available: data.available,
                maxClaims: data.maxClaims,
                validFrom: data.validFrom ? new Date(data.validFrom) : undefined,
                validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
            },
        });

        return successResponse(res, reward, 'Reward created', 201);
    } catch (error) {
        return next(error);
    }
});

/**
 * Update reward
 */
router.patch('/rewards/:id', adminAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = createRewardSchema.partial().parse(req.body);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateData: any = { ...data };
        if (data.pointsRequired) updateData.pointsRequired = BigInt(data.pointsRequired);
        if (data.validFrom) updateData.validFrom = new Date(data.validFrom);
        if (data.validUntil) updateData.validUntil = new Date(data.validUntil);

        const reward = await prisma.reward.update({
            where: { id: req.params.id },
            data: updateData,
        });

        return successResponse(res, reward, 'Reward updated');
    } catch (error) {
        return next(error);
    }
});

/**
 * Delete reward
 */
router.delete('/rewards/:id', adminAuth, superAdminOnly, async (req: Request, res: Response, next: NextFunction) => {
    try {
        await prisma.reward.delete({
            where: { id: req.params.id },
        });

        return successResponse(res, null, 'Reward deleted');
    } catch (error) {
        return next(error);
    }
});

// ============================================================================
// ADMIN MANAGEMENT (superadmin only)
// ============================================================================

/**
 * List admins
 */
router.get('/admins', adminAuth, superAdminOnly, async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const admins = await prisma.admin.findMany({
            orderBy: { createdAt: 'desc' },
        });

        return successResponse(res, admins);
    } catch (error) {
        return next(error);
    }
});

const createAdminSchema = z.object({
    walletAddress: z.string().min(1),
    name: z.string().min(1),
    role: z.enum(['admin', 'superadmin']).default('admin'),
});

/**
 * Create admin
 */
router.post('/admins', adminAuth, superAdminOnly, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = createAdminSchema.parse(req.body);

        const admin = await prisma.admin.create({
            data: {
                walletAddress: data.walletAddress,
                name: data.name,
                role: data.role,
            },
        });

        return successResponse(res, admin, 'Admin created', 201);
    } catch (error) {
        return next(error);
    }
});

// ============================================================================
// MVP SBT ISSUANCE (Open for Frontend Demo)
// ============================================================================

router.post('/sbt/issue', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { walletAddress } = req.body;
        if (!walletAddress) throw new AppError('Wallet address required', 400, 'BAD_REQUEST');

        let normalizedAddress: string;
        try {
            normalizedAddress = Address.parse(walletAddress).toRawString();
        } catch (e) {
            throw new AppError('Invalid TON wallet address format', 400, 'INVALID_ADDRESS');
        }

        const setting = await prisma.systemSetting.upsert({
            where: { key: 'issued_sbt_wallets' },
            update: {},
            create: { key: 'issued_sbt_wallets', value: '[]', type: 'json' }
        });
        
        const wallets = JSON.parse(setting.value);
        if (!wallets.includes(normalizedAddress)) {
            wallets.push(normalizedAddress);
            await prisma.systemSetting.update({
                where: { key: 'issued_sbt_wallets' },
                data: { value: JSON.stringify(wallets) }
            });
        }
        await logAction({
            actorId: 'admin',
            actorType: 'admin',
            action: 'ISSUE_SBT',
            entityType: 'wallet',
            entityId: normalizedAddress,
            metadata: { walletAddress: normalizedAddress },
        });

        return successResponse(res, { success: true }, 'SBT issued');
    } catch (error) {
        return next(error);
    }
});

router.post('/sbt/revoke', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { walletAddress } = req.body;
        if (!walletAddress) throw new AppError('Wallet address required', 400, 'BAD_REQUEST');

        let normalizedAddress: string;
        try {
            normalizedAddress = Address.parse(walletAddress).toRawString();
        } catch {
            throw new AppError('Invalid TON wallet address format', 400, 'INVALID_ADDRESS');
        }

        const setting = await prisma.systemSetting.findUnique({
            where: { key: 'issued_sbt_wallets' },
        });

        if (setting) {
            const wallets: string[] = JSON.parse(setting.value);
            const updated = wallets.filter((w) => w !== normalizedAddress);
            await prisma.systemSetting.update({
                where: { key: 'issued_sbt_wallets' },
                data: { value: JSON.stringify(updated) },
            });
        }

        await logAction({
            actorId: 'admin',
            actorType: 'admin',
            action: 'REVOKE_SBT',
            entityType: 'wallet',
            entityId: normalizedAddress,
            metadata: { walletAddress: normalizedAddress },
        });

        return successResponse(res, { success: true }, 'SBT revoked');
    } catch (error) {
        return next(error);
    }
});

// ============================================================================
// AUDIT LOG
// ============================================================================

/**
 * GET /admin/audit-logs — List recent audit log entries (open for admin panel demo)
 */
router.get('/audit-logs', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.auditLog.count(),
        ]);

        return paginatedResponse(res, logs, page, limit, total);
    } catch (error) {
        return next(error);
    }
});

router.get('/sbt/check/:walletAddress', async (req: Request, res: Response, next: NextFunction) => {
    try {
        let normalizedAddress: string;
        try {
            normalizedAddress = Address.parse(req.params.walletAddress).toRawString();
        } catch (e) {
            return successResponse(res, { hasSbt: false });
        }
        
        const setting = await prisma.systemSetting.findUnique({
            where: { key: 'issued_sbt_wallets' }
        });
        
        if (!setting) {
            return successResponse(res, { hasSbt: false });
        }
        
        const wallets = JSON.parse(setting.value);
        return successResponse(res, { hasSbt: wallets.includes(normalizedAddress) });
    } catch (error) {
        return next(error);
    }
});

export default router;
