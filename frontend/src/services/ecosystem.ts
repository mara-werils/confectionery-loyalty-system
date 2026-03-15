
// Frontend-Backend communication service
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export const EcosystemService = {
    // Simulate getting user balance (SWEET + KZT equivalent)
    getBalance: async () => {
        // In real app: GET /api/wallet/balance
        return {
            sweet: 15420,
            kztEquivalent: 15420, // 1:1 Peg
            gov: 120, // SWEET-GOV
            lp: 4500, // SWEET-LP
        };
    },

    // Mint tokens via Backend to User Wallet
    mintTokens: async (amount: number, targetWallet: string) => {
        try {
            const response = await axios.post(`${API_URL}/loyalty/mint`, {
                amount,
                targetWallet
            });
            return response.data;
        } catch (e) {
            console.error('Failed to mint tokens:', e);
            throw e;
        }
    },

    // Simulate Kaspi POS Transfer B2C
    transferToClient: async (amount: number, clientWallet: string) => {
        try {
            const response = await axios.post(`${API_URL}/loyalty/transfer`, {
                amount,
                clientWallet
            });
            return response.data;
        } catch (e) {
            console.error('Failed to transfer tokens:', e);
            throw e;
        }
    },

    // Burn (Fiat Out)
    withdrawToKaspi: async (amount: number) => {
        // Simulate API call to burn tokens
        await new Promise(r => setTimeout(r, 1500)); // Fake network delay
        console.log(`Withdrew ${amount} to Kaspi`);
        return true;
    }
};
