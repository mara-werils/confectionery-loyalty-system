import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../../store/authStore';

describe('authStore', () => {
    beforeEach(() => {
        // Reset the store before each test
        useAuthStore.setState({
            token: null,
            refreshToken: null,
            user: null,
            walletAddress: null,
            isAuthenticated: false,
        });
    });

    describe('setToken', () => {
        it('should set token and update isAuthenticated to true', () => {
            useAuthStore.getState().setToken('test-token');

            const state = useAuthStore.getState();
            expect(state.token).toBe('test-token');
            expect(state.isAuthenticated).toBe(true);
        });

        it('should set isAuthenticated to false when token is null', () => {
            useAuthStore.getState().setToken('test-token');
            useAuthStore.getState().setToken(null);

            const state = useAuthStore.getState();
            expect(state.token).toBeNull();
            expect(state.isAuthenticated).toBe(false);
        });
    });

    describe('setUser', () => {
        it('should set user correctly', () => {
            const mockUser = {
                id: 'user-123',
                walletAddress: 'EQD-test-wallet',
                companyName: 'Test Coffee',
                tier: 'GOLD' as const,
                status: 'ACTIVE' as const,
            };

            useAuthStore.getState().setUser(mockUser);

            const state = useAuthStore.getState();
            expect(state.user).toEqual(mockUser);
            expect(state.user?.companyName).toBe('Test Coffee');
        });
    });

    describe('setWalletAddress', () => {
        it('should set wallet address', () => {
            useAuthStore.getState().setWalletAddress('EQD-new-wallet');

            expect(useAuthStore.getState().walletAddress).toBe('EQD-new-wallet');
        });
    });

    describe('logout', () => {
        it('should clear all auth state', () => {
            // Setup authenticated state
            useAuthStore.getState().setToken('test-token');
            useAuthStore.getState().setRefreshToken('refresh-token');
            useAuthStore.getState().setUser({
                id: 'user-123',
                walletAddress: 'EQD-test',
                companyName: 'Test',
                tier: 'BRONZE',
                status: 'ACTIVE',
            });

            // Logout
            useAuthStore.getState().logout();

            const state = useAuthStore.getState();
            expect(state.token).toBeNull();
            expect(state.refreshToken).toBeNull();
            expect(state.user).toBeNull();
            expect(state.isAuthenticated).toBe(false);
        });
    });
});
