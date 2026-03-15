import { TonClient, Address } from '@ton/ton';

// Use same endpoint as deployed contracts
const endpoint = 'https://testnet.toncenter.com/api/v2/jsonRPC';

export const tonClient = new TonClient({
  endpoint,
  // Free tier is usually enough for a demo, but can be rate-limited
});

// Hardcoded deployed contract addresses from earlier deployment
export const CONTRACT_ADDRESSES = {
  loyaltyToken: 'kQBNOiJ4aToE-Ea12DpY5nBmu1bKT0axt81JmS9BFPh8nCio',
  partnerRegistry: 'kQCtFd8sLhJDFQiSd8Zgct6Z8ODtMy5A6-CYaaBuIClffsIg',
  redemptionManager: 'kQBChxrJHHMwqy0gL9DqPmcsM_K1FS7WGIz_pt00AJp_fVjw',
  revenueDistribution: 'kQCSaOfJrZncDkbYD_bzSxEVksQzuC8JoAUDWXPffwhYu39w',
};

export interface ContractState {
  address: string;
  state: 'active' | 'uninitialized' | 'default';
  balance: number; // in TON
}

export const BlockchainService = {
  /**
   * Fetches the current state of a given contract address
   */
  getContractState: async (addressString: string): Promise<ContractState> => {
    try {
      const address = Address.parse(addressString);
      const state = await tonClient.getContractState(address);
      
      return {
        address: addressString,
        state: state.state as 'active' | 'uninitialized' | 'default',
        balance: Number(state.balance) / 1e9, // Convert NanoTON to TON
      };
    } catch (error) {
      console.error(`Failed to fetch state for ${addressString}`, error);
      return {
        address: addressString,
        state: 'default',
        balance: 0,
      };
    }
  },

  /**
   * Fetches states for all main ecosystem contracts
   */
  getAllContractsState: async (): Promise<Record<string, ContractState>> => {
    const results: Record<string, ContractState> = {};
    
    // Process serially to avoid rate limits on free tier
    for (const [key, address] of Object.entries(CONTRACT_ADDRESSES)) {
      results[key] = await BlockchainService.getContractState(address);
      // Small delay to help with rate limits
      await new Promise(r => setTimeout(r, 500));
    }
    
    return results;
  },

  /**
   * Example: Call a GET method on the Loyalty Token (Jetton Master)
   * get_jetton_data returns: (total_supply, mintable, admin_address, jetton_content, jetton_wallet_code)
   */
  getLoyaltyTokenData: async () => {
    try {
      const address = Address.parse(CONTRACT_ADDRESSES.loyaltyToken);
      const result = await tonClient.runMethod(address, 'get_jetton_data');
      
      const totalSupply = result.stack.readBigNumber();
      const mintable = result.stack.readBoolean();
      const adminAddress = result.stack.readAddress();
      
      return {
        totalSupply: Number(totalSupply) / 1e9, // Assuming 9 decimals
        mintable,
        adminAddress: adminAddress.toString({ testOnly: true }),
      };
    } catch (error) {
      console.error('Failed to get jetton data', error);
      return null;
    }
  }
};
