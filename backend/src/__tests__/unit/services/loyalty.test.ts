import { calculatePoints, getTierMultiplier } from '../../../services/loyalty';

describe('Loyalty Service', () => {
    describe('calculatePoints', () => {
        it('should calculate base points correctly (1:1 rate)', () => {
            expect(calculatePoints(100, 1.0)).toBe(100);
            expect(calculatePoints(50.5, 1.0)).toBe(50);
        });

        it('should apply multiplier correctly', () => {
            expect(calculatePoints(100, 1.5)).toBe(150);
            expect(calculatePoints(100, 2.0)).toBe(200);
        });
    });

    describe('getTierMultiplier', () => {
        it('should return correct multiplier for each tier', () => {
            expect(getTierMultiplier('BRONZE')).toBe(1.0);
            expect(getTierMultiplier('SILVER')).toBe(1.5);
            expect(getTierMultiplier('GOLD')).toBe(2.0);
        });
    });
});
