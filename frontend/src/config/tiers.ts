export const TIER_CONFIG = {
  BRONZE: { next: 'SILVER' as const, threshold: 5000, color: 'text-orange-400', bar: 'bg-orange-400', labelKey: 'customerDashboard.tierBronze' },
  SILVER: { next: 'GOLD' as const, threshold: 20000, color: 'text-stone-300', bar: 'bg-stone-300', labelKey: 'customerDashboard.tierSilver' },
  GOLD:   { next: 'MAX' as const, threshold: 0, color: 'text-amber-400', bar: 'bg-amber-400', labelKey: 'customerDashboard.tierGold' },
} as const;

export type TierName = keyof typeof TIER_CONFIG;
