import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { successResponse } from '../utils/response';
import {
  computeChurnRisks,
  computeRevenueForecast,
  computeRecommendations,
} from '../services/ai.service';

const router = Router();

/**
 * @swagger
 * /ai/churn:
 *   get:
 *     summary: Churn risk prediction for partners
 *     description: >
 *       Returns a churn risk score (0–100) and risk level for each active partner.
 *       Admins see all partners; partners see only their own score.
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Churn risk scores
 */
router.get(
  '/churn',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isAdmin = req.user!.type === 'admin';
      const partnerIdFilter = isAdmin ? undefined : req.user!.id;
      const results = await computeChurnRisks(partnerIdFilter);
      return successResponse(res, results);
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * @swagger
 * /ai/forecast:
 *   get:
 *     summary: 30-day revenue forecast using linear regression
 *     description: >
 *       Analyses the last 90 days of transaction data and produces a 30-day
 *       forecast using linear regression. Returns chart-ready data points,
 *       trend direction, and R²-based confidence score.
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Revenue forecast data
 */
router.get(
  '/forecast',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isAdmin = req.user!.type === 'admin';
      const partnerIdFilter = isAdmin ? undefined : req.user!.id;
      const result = await computeRevenueForecast(partnerIdFilter);
      return successResponse(res, result);
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * @swagger
 * /ai/recommendations:
 *   get:
 *     summary: Personalised reward recommendations
 *     description: >
 *       Returns the top 3 reward recommendations for the authenticated partner,
 *       scored by affordability, popularity, tier relevance, and novelty.
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reward recommendations
 */
router.get(
  '/recommendations',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.user!.type !== 'partner') {
        return successResponse(res, { recommendations: [], personalizedMessage: 'Available for partners only.' });
      }
      const result = await computeRecommendations(req.user!.id);
      return successResponse(res, result);
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
