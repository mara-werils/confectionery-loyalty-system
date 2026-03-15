import { jest, describe, it, expect, beforeEach } from '@jest/globals';

jest.unmock('@services/ton');
import { verifyWalletSignature, verifyNonce } from '@services/ton';
import { cache } from '@services/redis';

describe('TON Service', () => {
    describe('verifyNonce', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should return true if nonce is not used', async () => {
            // @ts-ignore
            jest.spyOn(cache, 'exists').mockResolvedValue(false as never);
            // @ts-ignore
            jest.spyOn(cache, 'set').mockResolvedValue(undefined as never);

            const result = await verifyNonce('new-nonce');
            expect(result).toBe(true);
            expect(cache.set).toHaveBeenCalledWith('nonce:new-nonce', '1', 300);
        });

        it('should return false if nonce is already used', async () => {
            // @ts-ignore
            jest.spyOn(cache, 'exists').mockResolvedValue(true as never);

            const result = await verifyNonce('used-nonce');
            expect(result).toBe(false);
        });
    });

    describe('verifyWalletSignature', () => {
        it('should return false for invalid signature formats', async () => {
            const result = await verifyWalletSignature('pubkey', 'msg', 'invalid-hex');
            expect(result).toBe(false);
        });
    });
});
