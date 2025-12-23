import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_NAME: z.string().default('ConfectioneryLoyalty'),
  APP_VERSION: z.string().default('1.0.0'),
  API_PORT: z.string().transform(Number).default('3001'),
  API_PREFIX: z.string().default('/api/v1'),

  // Database
  DATABASE_URL: z.string(),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_SECRET: z.string().min(32).optional(),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('60000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // TON
  TON_NETWORK: z.enum(['mainnet', 'testnet']).default('testnet'),
  TON_API_KEY: z.string().optional(),
  TON_ENDPOINT: z.string().optional(),
  LOYALTY_TOKEN_ADDRESS: z.string().optional(),
  PARTNER_REGISTRY_ADDRESS: z.string().optional(),
  REDEMPTION_MANAGER_ADDRESS: z.string().optional(),
  REVENUE_DISTRIBUTION_ADDRESS: z.string().optional(),

  // Telegram
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_WEBHOOK_URL: z.string().optional(),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
});

const env = envSchema.parse(process.env);

export const config = {
  app: {
    name: env.APP_NAME,
    version: env.APP_VERSION,
    env: env.NODE_ENV,
    port: env.API_PORT,
    apiPrefix: env.API_PREFIX,
  },
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshSecret: env.JWT_REFRESH_SECRET || env.JWT_SECRET,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_REQUESTS,
  },
  cors: {
    origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()),
  },
  ton: {
    network: env.TON_NETWORK,
    apiKey: env.TON_API_KEY,
    endpoint: env.TON_ENDPOINT || (env.TON_NETWORK === 'mainnet'
      ? 'https://toncenter.com/api/v2/jsonRPC'
      : 'https://testnet.toncenter.com/api/v2/jsonRPC'),
    contracts: {
      loyaltyToken: env.LOYALTY_TOKEN_ADDRESS,
      partnerRegistry: env.PARTNER_REGISTRY_ADDRESS,
      redemptionManager: env.REDEMPTION_MANAGER_ADDRESS,
      revenueDistribution: env.REVENUE_DISTRIBUTION_ADDRESS,
    },
  },
  telegram: {
    botToken: env.TELEGRAM_BOT_TOKEN,
    webhookUrl: env.TELEGRAM_WEBHOOK_URL,
  },
  logging: {
    level: env.LOG_LEVEL,
  },
};

export type Config = typeof config;




