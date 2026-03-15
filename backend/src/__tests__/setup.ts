import { jest } from '@jest/globals';

process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
process.env.JWT_SECRET = 'test-secret-at-least-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-characters-long';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.TON_API_KEY = 'test-api-key';
process.env.LOYALTY_TOKEN_ADDRESS = 'EQD...';
process.env.PARTNER_REGISTRY_ADDRESS = 'EQD...';
process.env.REDEMPTION_MANAGER_ADDRESS = 'EQD...';
process.env.REVENUE_DISTRIBUTION_ADDRESS = 'EQD...';
process.env.NODE_ENV = 'test';

// Mock TON Service
jest.mock('@services/ton', () => ({
    verifyWalletSignature: jest.fn(),
    verifyNonce: jest.fn(),
    getWalletBalance: jest.fn(),
    isContractDeployed: jest.fn(),
    getJettonBalance: jest.fn(),
    subscribeToContract: jest.fn(),
}));

// Mock Prisma

jest.mock('@utils/prisma', () => ({
    prisma: {
        partner: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
        loyaltyPoints: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
        transaction: { create: jest.fn() },
        $transaction: jest.fn((promises: any) => Promise.all(promises)),
    },
}));

// Mock Logger
jest.mock('@utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        http: jest.fn(),
    },
}));
