# 📜 Smart Contracts

TON smart contracts for the Confectionery Loyalty System.

## Overview

This package contains the FunC smart contracts that power the loyalty system on the TON blockchain.

### Contracts

| Contract | Description | Standard |
|----------|-------------|----------|
| `LoyaltyToken` | Jetton minter for loyalty points | TEP-74 |
| `JettonWallet` | Individual token wallet | TEP-74 |
| `PartnerRegistry` | Partner management and tiers | Custom |
| `RedemptionManager` | Reward redemption system | Custom |
| `RevenueDistribution` | Commission distribution | Custom |

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
npm install
```

### Build Contracts

```bash
npm run build
```

### Run Tests

```bash
npm run test
```

### Deploy

```bash
# Deploy all contracts to testnet
npm run deploy

# Or deploy individual contracts
npx blueprint run deployLoyaltyToken
npx blueprint run deployPartnerRegistry
npx blueprint run deployRedemptionManager
npx blueprint run deployRevenueDistribution

# Deploy all at once
npx blueprint run deployAll
```

## Contract Details

### LoyaltyToken (Jetton Master)

Jetton-compliant token representing loyalty points.

**Storage:**
- `total_supply` - Total tokens minted
- `admin_address` - Contract admin
- `content` - Token metadata (TEP-64)
- `jetton_wallet_code` - Wallet bytecode

**Operations:**
- `mint` - Create new tokens (admin only)
- `burn_notification` - Handle burns from wallets
- `change_admin` - Transfer admin rights
- `change_content` - Update metadata

**Get Methods:**
- `get_jetton_data()` - Token info (TEP-74)
- `get_wallet_address(owner)` - Calculate wallet address

### PartnerRegistry

Manages partner registration and tier system.

**Tiers:**
- Bronze (1x multiplier)
- Silver (1.5x multiplier)
- Gold (2x multiplier)

**Status:**
- Pending, Active, Suspended, Banned

**Operations:**
- `register_partner` - Add new partner
- `update_partner_tier` - Change tier
- `update_partner_status` - Change status
- `record_earning` - Track earnings

### RedemptionManager

Handles reward catalog and redemption processing.

**Reward Categories:**
- Discount
- Product
- Cashback
- Special

**Operations:**
- `add_reward` - Create reward
- `update_reward` - Modify reward
- `request_redemption` - Partner claims reward
- `process_redemption` - Admin approves/rejects

### RevenueDistribution

Calculates and distributes commissions.

**Commission Rates:**
- Bronze: 3%
- Silver: 5%
- Gold: 7%
- Platform fee: 1%

**Operations:**
- `record_transaction` - Log transaction
- `distribute_commission` - Send payout
- `batch_distribute` - Multiple payouts
- `withdraw_platform_fee` - Collect fees

## Testing

Tests use the TON Sandbox for local blockchain simulation.

```bash
# Run all tests
npm run test

# Run with coverage
npm run test -- --coverage

# Run specific test
npm run test -- LoyaltyToken
```

### Test Coverage Requirements

- Minimum 80% coverage required
- All public operations must be tested
- Edge cases and error conditions

## Gas Optimization

Contracts are optimized for minimal gas usage:

- Inline functions where appropriate
- Efficient storage layout
- Minimal message bouncing

## Security Considerations

Before mainnet deployment:

1. **Access Control**
   - All admin functions require owner verification
   - No reentrancy vulnerabilities

2. **Input Validation**
   - All inputs validated before processing
   - Proper error codes for debugging

3. **Third-Party Audit**
   - Required before mainnet deployment
   - Document all findings and fixes

## Directory Structure

```
contracts/
├── contracts/           # FunC source files
│   ├── imports/         # Standard libraries
│   ├── loyalty_token.fc
│   ├── jetton_wallet.fc
│   ├── partner_registry.fc
│   ├── redemption_manager.fc
│   └── revenue_distribution.fc
├── wrappers/            # TypeScript wrappers
├── tests/               # Jest test files
├── scripts/             # Deployment scripts
└── build/               # Compiled contracts
```

## References

- [TON Documentation](https://docs.ton.org/)
- [FunC Language](https://docs.ton.org/develop/func/overview)
- [TEP-74 Jetton Standard](https://github.com/ton-blockchain/TEPs/blob/master/text/0074-jettons-standard.md)
- [TON Blueprint](https://github.com/ton-org/blueprint)




