# 📱 Frontend

React Telegram Mini App for the Confectionery Loyalty System.

## Overview

A mobile-first web application designed to work as a Telegram Mini App, allowing partners to manage their loyalty points and redeem rewards.

### Features

- 🔗 TonConnect wallet integration
- 📊 Real-time balance and stats
- 🎁 Reward catalog and claims
- 📱 Responsive Telegram-native UI
- ⚡ Fast performance with code splitting

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

App will be available at http://localhost:5173

### Build

```bash
npm run build
npm run preview
```

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **TanStack Query** - Data fetching
- **Zustand** - State management
- **Framer Motion** - Animations
- **@tonconnect/ui-react** - Wallet integration

## Project Structure

```
frontend/
├── src/
│   ├── components/      # Reusable components
│   │   ├── BalanceCard.tsx
│   │   ├── Layout.tsx
│   │   ├── RewardCard.tsx
│   │   └── WalletConnect.tsx
│   ├── pages/           # Page components
│   │   ├── Home.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Rewards.tsx
│   │   ├── History.tsx
│   │   └── Profile.tsx
│   ├── hooks/           # Custom hooks
│   │   ├── useApi.ts
│   │   └── useTelegram.ts
│   ├── services/        # API services
│   │   └── api.ts
│   ├── store/           # Zustand stores
│   │   └── authStore.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── public/
│   └── tonconnect-manifest.json
└── index.html
```

## Pages

### Home
Landing page with wallet connection for new users.

### Dashboard
Main view showing:
- Current balance
- Tier progress
- Recent transactions
- Quick actions

### Rewards
Catalog of available rewards with:
- Category filters
- Claim functionality
- Points requirements

### History
Transaction and claims history with:
- Tab navigation
- Infinite scroll
- Status tracking

### Profile
Account management:
- Account details
- Settings links
- Wallet disconnect

## Telegram Integration

The app uses the Telegram Web App API for native features:

```typescript
import { useTelegram } from './hooks/useTelegram';

const { tg, hapticFeedback, showConfirm } = useTelegram();

// Haptic feedback
hapticFeedback('success');

// Native confirm dialog
const confirmed = await showConfirm('Are you sure?');
```

## TonConnect

Wallet connection is handled via TonConnect:

```typescript
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';

const wallet = useTonWallet();
const [tonConnectUI] = useTonConnectUI();

// Disconnect
await tonConnectUI.disconnect();
```

## Styling

Using TailwindCSS with custom theme:

- **Primary**: Warm orange/coral (#ed7126)
- **Accent**: Chocolate brown (#8b5442)
- **Success**: Mint green (#22c55e)

Custom components defined in `index.css`:
- `.card`, `.card-elevated`
- `.btn-primary`, `.btn-secondary`
- `.badge-bronze`, `.badge-silver`, `.badge-gold`

## Environment Variables

```env
VITE_API_URL=http://localhost:3001/api/v1
VITE_WS_URL=ws://localhost:3001
VITE_TON_NETWORK=testnet
VITE_TONCONNECT_MANIFEST_URL=https://your-domain/tonconnect-manifest.json
```

## Testing

```bash
# Run tests
npm run test

# Watch mode
npm run test -- --watch
```

## Build Optimization

The production build includes:
- Code splitting by route
- Vendor chunks (react, tanstack-query, ton)
- Tree shaking
- Minification

Target bundle size: < 1.5MB

## Accessibility

- ARIA labels on interactive elements
- Keyboard navigation support
- Color contrast compliance
- Screen reader friendly












