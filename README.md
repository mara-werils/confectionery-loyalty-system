# Confectionery Loyalty System

> Blockchain-based loyalty system for confectioneries using TON smart contracts

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

This project implements a complete loyalty system for confectionery businesses (bakeries, cafes, pastry shops) in Kazakhstan. Partners earn loyalty points on purchases and can redeem them for rewards. The system is built on the TON blockchain for transparency and security.

### Key Features

- **Blockchain-Powered**: Jetton tokens on TON for transparent point tracking
- **Telegram Mini App**: Seamless integration with Telegram
- **TonConnect**: Easy wallet connection
- **Reward Catalog**: Discounts, products, cashback, and special offers
- **Analytics Dashboard**: Real-time statistics and growth tracking
- **Real-time Updates**: WebSocket notifications for instant feedback
- **Tier System**: Bronze, Silver, Gold tiers with increasing benefits

## Tech Stack

### Backend
- Node.js
- TypeScript
- Express.js
- PostgreSQL
- Prisma ORM
- Redis

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- TonConnect UI

### Blockchain Layer
- FunC
- TON Core
- TON Blueprint

### DevOps
- Vercel Deployment
- Docker
- Docker Compose
- GitHub Actions

---

## Architecture

```text
┌─────────────────────┐
│ Telegram Mini App   │
│ (React + Vite)      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ TonConnect Wallet   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ TON Blockchain      │
│ Smart Contracts     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Backend API         │
│ (Express.js)        │
└───────┬─────┬───────┘
        │     │
        ▼     ▼
 ┌─────────┐ ┌─────────┐
 │Redis    │ │PostgreSQL│
 │Cache    │ │Database  │
 └─────────┘ └─────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15+ (or use Docker)
- TON Wallet (for testing)

### Installation

1. **Clone the repository**
 ```bash
 git clone https://github.com/mara-werils/confectionery-loyalty-system.git
 cd loyalty-system
 ```

2. **Install dependencies**
 ```bash
 npm install
 ```

3. **Start with Docker** (recommended)
 ```bash
 docker-compose up -d
 ```

4. **Or start services individually**
 ```bash
 # Terminal 1 - Backend
 cd backend
 npm install
 npm run db:migrate
 npm run dev

 # Terminal 2 - Frontend
 cd frontend
 npm install
 npm run dev

 # Terminal 3 - Contracts (optional)
 cd contracts
 npm install
 npm run build
 npm run test
 ```

5. **Open the application**
 - Frontend: http://localhost:5173
 - Backend API: http://localhost:3001
 - API Docs: http://localhost:3001/api/docs

## Project Structure

``` python
 contracts/ # TON smart contracts (FunC)
    contracts/ # FunC source files
    wrappers/ # TypeScript wrappers
    tests/ # Contract tests
    scripts/ # Deployment scripts

 backend/ # Express.js API
    src/
    config/ # Configuration
    middleware/ # Express middleware
    routes/ # API routes
    services/ # Business logic
    utils/ # Utilities
    prisma/ # Database schema

 frontend/ # React Telegram Mini App
    src/
    components/ # React components
    pages/ # Page components
    hooks/ # Custom hooks
    services/ # API services
    store/ # Zustand store
    public/ # Static assets

 bot/ # Telegram bot server
    src/

 docker/ # Docker configurations
 .github/ # GitHub Actions
```

## Configuration

### Environment Variables

Copy the example environment file and configure:

```bash
cp .env.example .env
```

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT tokens
- `TON_NETWORK` - `testnet` or `mainnet`
- `TELEGRAM_BOT_TOKEN` - Telegram bot token

## Smart Contracts

### Contracts Overview

| Contract | Description |
|----------|-------------|
| `LoyaltyToken` | Jetton-compliant token for loyalty points |
| `JettonWallet` | Individual wallet for token holders |
| `PartnerRegistry` | Partner registration and tier management |
| `RedemptionManager` | Reward catalog and redemption processing |
| `RevenueDistribution` | Commission calculation and payouts |

### Deploy Contracts

```bash
cd contracts
npm run build
npm run deploy # Deploy to testnet
```

## Testing

```bash
# All tests
npm run test

# Contracts only
npm run contracts:test

# Backend only
npm run backend:test

# Frontend only
npm run frontend:test
```

## API Documentation

Full API documentation is available at `/api/docs` when the backend is running.

### Main Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new partner |
| POST | `/api/v1/auth/login` | Login with wallet signature |
| GET | `/api/v1/loyalty/balance` | Get current balance |
| GET | `/api/v1/rewards` | List available rewards |
| POST | `/api/v1/rewards/:id/claim` | Claim a reward |

## Deployment

### Docker Deployment

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Manual Deployment

1. Build all packages
 ```bash
 npm run build
 ```

2. Run database migrations
 ```bash
 npm run db:migrate:prod
 ```

3. Start services
 ```bash
 npm run start
 ```

## Security

- All wallet interactions use signature verification
- JWT tokens with configurable expiration
- Rate limiting on all endpoints
- Input validation with Zod
- CORS configuration for trusted domains

### Smart Contract Security

Before mainnet deployment:
- [ ] Complete internal audit
- [ ] Third-party security audit
- [ ] Gas optimization review
- [ ] Access control verification

## Metrics & Monitoring

- **Sentry** for error tracking
- **Winston** for structured logging
- Health check endpoint at `/health`

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file.

## Support

For support, please open an issue or contact the team.











