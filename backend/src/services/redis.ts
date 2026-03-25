import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';

const createStub = () => ({
    on: (): void => { },
    get: async (): Promise<string | null> => null,
    set: async (): Promise<void> => { },
    setex: async (): Promise<void> => { },
    del: async (): Promise<number> => 0,
    exists: async (): Promise<number> => 0,
// eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let redis: any;

if (config.app.env === 'test' || !config.redis.host) {
    // Use in-memory stub when Redis is not available (free hosting, test, etc.)
    redis = createStub();
    logger.info('Redis: using in-memory stub (no external Redis configured)');
} else {
    try {
        redis = new Redis({
            host: config.redis.host,
            port: config.redis.port,
            password: config.redis.password,
            retryStrategy: (times: number) => {
                if (times > 3) {
                    logger.warn('Redis: max retries reached, falling back to stub');
                    return null; // stop retrying
                }
                return Math.min(times * 50, 2000);
            },
        });

        redis.on('connect', () => {
            logger.info('Connected to Redis');
        });

        redis.on('error', (error: Error) => {
            logger.error('Redis error:', error.message);
        });
    } catch {
        logger.warn('Redis: failed to initialize, using in-memory stub');
        redis = createStub();
    }
}



export const cache = {
    async get(key: string): Promise<string | null> {
        return redis.get(key);
    },

    async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
        if (ttlSeconds) {
            await redis.setex(key, ttlSeconds, value);
        } else {
            await redis.set(key, value);
        }
    },

    async del(key: string): Promise<void> {
        await redis.del(key);
    },

    async exists(key: string): Promise<boolean> {
        const result = await redis.exists(key);
        return result === 1;
    },
};

export default redis;
