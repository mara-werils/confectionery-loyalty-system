import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

const SWEET_CONTRACT = '0:4d3a2278693a04f846b5d83a58e67066bb56ca4f46b1b7cd49992f4114f87c9c';

function safeFromJettonRaw(rawBalance: string, decimals: number): number {
  const safeDecimals = Number.isFinite(decimals) ? Math.max(0, Math.min(30, decimals)) : 9;
  const divisor = 10n ** BigInt(safeDecimals);
  return Number(BigInt(rawBalance) / divisor);
}

export const EcosystemService = {
  // Get real balances from TON testnet API
  getBalance: async (walletAddress: string) => {
    try {
      const [jettonsRes, balanceRes] = await Promise.all([
        fetch(`https://testnet.tonapi.io/v2/accounts/${walletAddress}/jettons`),
        fetch(`https://testnet.tonapi.io/v2/accounts/${walletAddress}`),
      ]);

      const jettonsData = await jettonsRes.json();
      const accountData = await balanceRes.json();

      const sweet = jettonsData.balances?.find(
        (b: { jetton: { address: string; decimals: number }; balance: string }) =>
          b.jetton?.address?.toLowerCase() === SWEET_CONTRACT
      );

      const sweetBalance = sweet
        ? safeFromJettonRaw(sweet.balance, sweet.jetton?.decimals || 9)
        : 0;

      const tonBalance = accountData.balance
        ? Number(BigInt(accountData.balance) / BigInt(1e9))
        : 0;

      return {
        sweet: sweetBalance,
        ton: tonBalance,
        kztEquivalent: sweetBalance,
      };
    } catch {
      return { sweet: 0, ton: 0, kztEquivalent: 0 };
    }
  },

  mintTokens: async (amount: number, targetWallet: string) => {
    const response = await axios.post(`${API_URL}/loyalty/mint`, { amount, targetWallet });
    return response.data;
  },

  transferToClient: async (amount: number, clientWallet: string) => {
    const response = await axios.post(`${API_URL}/loyalty/transfer`, { amount, clientWallet });
    return response.data;
  },
};
