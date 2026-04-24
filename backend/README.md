# Backend API

Express.js API server for the Confectionery Loyalty System.

## Overview

RESTful API with WebSocket support for real-time updates.

### Features

- JWT authentication with wallet signature verification
- PostgreSQL database with Prisma ORM
- Real-time WebSocket events
- Swagger/OpenAPI documentation
- Rate limiting and security middleware

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis (optional, for caching)

### Installation

```bash
npm install
```

### Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed initial data
npm run db:seed
```

### Development

```bash
npm run dev
```

Server will start at http://localhost:3001

### Build

```bash
npm run build
npm run start
```

## API Documentation

Interactive API docs available at `/api/docs` when server is running.

### Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

### Main Endpoints

#### Auth
- `POST /api/v1/auth/register` - Register new partner
- `POST /api/v1/auth/login` - Login with wallet signature
- `GET /api/v1/auth/me` - Get current user

#### Partners
- `GET /api/v1/partners` - List partners (admin)
- `GET /api/v1/partners/:id` - Get partner details
- `PATCH /api/v1/partners/:id` - Update partner

#### Loyalty
- `GET /api/v1/loyalty/balance` - Get current balance
- `GET /api/v1/loyalty/history` - Get points history
- `POST /api/v1/loyalty/redeem` - Redeem points

#### Transactions
- `POST /api/v1/transactions` - Record transaction
- `GET /api/v1/transactions` - List transactions

#### Rewards
- `GET /api/v1/rewards` - List rewards
- `POST /api/v1/rewards/:id/claim` - Claim reward

#### Analytics
- `GET /api/v1/analytics/summary` - Dashboard summary
- `GET /api/v1/analytics/growth` - Growth statistics

## WebSocket Events

Connect to the WebSocket server for real-time updates.

### Client Events
- `subscribe:partner` - Subscribe to partner updates
- `unsubscribe:partner` - Unsubscribe

### Server Events
- `balance:updated` - Balance changed
- `transaction:created` - New transaction
- `reward:claimed` - Reward claimed
- `tier:upgraded` - Tier level changed

## Database Schema

See `prisma/schema.prisma` for the complete database schema.

### Main Models
- `Partner` - B2B partners (confectioneries)
- `LoyaltyPoints` - Point balances
- `Transaction` - Transaction history
- `Reward` - Reward catalog
- `ClaimedReward` - Claimed rewards
- `CommissionPayout` - Payouts

## Environment Variables

```env
# App
NODE_ENV=development
API_PORT=3001
API_PREFIX=/api/v1

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/db

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# TON
TON_NETWORK=testnet
TON_API_KEY=your-api-key

# Telegram
TELEGRAM_BOT_TOKEN=your-bot-token
```

## Testing

```bash
# Run tests
npm run test

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Directory Structure

```
backend/
 src/
 config/ # Configuration
 middleware/ # Express middleware
 auth.ts # Authentication
 errorHandler.ts
 rateLimiter.ts
 routes/ # API routes
 auth.ts
 partners.ts
 loyalty.ts
 transactions.ts
 rewards.ts
 analytics.ts
 services/ # Business logic
 ton.ts # TON integration
 loyalty.ts # Points logic
 utils/ # Utilities
 logger.ts
 prisma.ts
 response.ts
 index.ts # Entry point
 prisma/
 schema.prisma # Database schema
 seed.ts # Seed data
 tests/ # Test files
```

## Security

- Helmet.js for HTTP headers
- CORS configuration
- Rate limiting (100 req/min)
- Input validation with Zod
- JWT authentication
- Wallet signature verification











