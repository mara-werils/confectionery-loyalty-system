import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  TagIcon,
  GiftIcon,
  SparklesIcon,
  TicketIcon,
  ClipboardDocumentIcon,
  CheckCircleIcon,
  CheckIcon,
  XMarkIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import { useAuthStore } from '../../store/authStore';
import { useTonWallet } from '@tonconnect/ui-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';

// ─── Data definitions ────────────────────────────────────────────────────────

type Category = 'DISCOUNT' | 'PRODUCT' | 'CASHBACK' | 'SPECIAL';
type FilterTab = 'all' | 'affordable' | Category;

interface Partner {
  id: string;
  name: string;
  shortName: string;
  logo: string | null;
  emoji: string;
  city: string;
  accentFrom: string;
  accentTo: string;
}

interface Reward {
  id: string;
  partnerId: string;
  titleKey: string;
  descKey: string;
  pointsRequired: number;
  category: Category;
  available: number;
}

const PARTNERS: Partner[] = [
  {
    id: 'homemacaron',
    name: 'Home Macaron',
    shortName: 'Macaron',
    logo: '/confectionary_logos/home_macaron.jpg',
    emoji: 'HM',
    city: 'Алматы',
    accentFrom: '#be185d',
    accentTo: '#9f1239',
  },
  {
    id: 'qulpynai',
    name: 'Qulpynai',
    shortName: 'Qulpynai',
    logo: null,
    emoji: 'Q',
    city: 'Алматы · 25 филиалов',
    accentFrom: '#b45309',
    accentTo: '#92400e',
  },
  {
    id: 'panaderia',
    name: 'Panaderia',
    shortName: 'Panaderia',
    logo: null,
    emoji: 'P',
    city: 'Алматы',
    accentFrom: '#c2410c',
    accentTo: '#9a3412',
  },
  {
    id: 'marrone_rosso',
    name: 'Marrone Rosso',
    shortName: 'Marrone',
    logo: null,
    emoji: 'MR',
    city: 'Алматы · Астана',
    accentFrom: '#b91c1c',
    accentTo: '#991b1b',
  },
  {
    id: 'taptatti',
    name: 'TapTatti',
    shortName: 'TapTatti',
    logo: null,
    emoji: 'TT',
    city: 'Астана · Доставка по КЗ',
    accentFrom: '#7c3aed',
    accentTo: '#6d28d9',
  },
  {
    id: 'platform',
    name: 'Sweet Platform',
    shortName: 'Platform',
    logo: null,
    emoji: 'SW',
    city: 'Все партнёры',
    accentFrom: '#d97706',
    accentTo: '#b45309',
  },
];

const PARTNER_MAP = Object.fromEntries(PARTNERS.map(p => [p.id, p]));

const REWARDS: Reward[] = [
  { id: 'hm-1', partnerId: 'homemacaron',   titleKey: 'hm-1-title', descKey: 'hm-1-desc', pointsRequired: 100,  category: 'DISCOUNT', available: 999 },
  { id: 'hm-2', partnerId: 'homemacaron',   titleKey: 'hm-2-title', descKey: 'hm-2-desc', pointsRequired: 350,  category: 'PRODUCT',  available: 50  },
  { id: 'ql-1', partnerId: 'qulpynai',      titleKey: 'ql-1-title', descKey: 'ql-1-desc', pointsRequired: 150,  category: 'DISCOUNT', available: 500 },
  { id: 'ql-2', partnerId: 'qulpynai',      titleKey: 'ql-2-title', descKey: 'ql-2-desc', pointsRequired: 200,  category: 'PRODUCT',  available: 100 },
  { id: 'pn-1', partnerId: 'panaderia',     titleKey: 'pn-1-title', descKey: 'pn-1-desc', pointsRequired: 180,  category: 'PRODUCT',  available: 200 },
  { id: 'pn-2', partnerId: 'panaderia',     titleKey: 'pn-2-title', descKey: 'pn-2-desc', pointsRequired: 300,  category: 'DISCOUNT', available: 80  },
  { id: 'mr-1', partnerId: 'marrone_rosso', titleKey: 'mr-1-title', descKey: 'mr-1-desc', pointsRequired: 80,   category: 'PRODUCT',  available: 300 },
  { id: 'mr-2', partnerId: 'marrone_rosso', titleKey: 'mr-2-title', descKey: 'mr-2-desc', pointsRequired: 400,  category: 'SPECIAL',  available: 50  },
  { id: 'tt-1', partnerId: 'taptatti',      titleKey: 'tt-1-title', descKey: 'tt-1-desc', pointsRequired: 500,  category: 'DISCOUNT', available: 100 },
  { id: 'tt-2', partnerId: 'taptatti',      titleKey: 'tt-2-title', descKey: 'tt-2-desc', pointsRequired: 250,  category: 'SPECIAL',  available: 300 },
  { id: 'pw-1', partnerId: 'platform',      titleKey: 'pw-1-title', descKey: 'pw-1-desc', pointsRequired: 500,  category: 'CASHBACK', available: 999 },
];

type Translations = Record<string, { en: string; ru: string; kz: string }>;
const TEXTS: Translations = {
  'hm-1-title': { en: '10% Discount on Macarons',       ru: 'Скидка 10% на макаруны',            kz: 'Макарундарға 10% жеңілдік' },
  'hm-1-desc':  { en: 'Get 10% off any macaron set',    ru: 'Скидка 10% на любой набор макарунов', kz: 'Кез келген макарун жинағына 10%' },
  'hm-2-title': { en: 'Free Box of 6 Macarons',         ru: 'Бесплатная коробка из 6 макарунов',  kz: '6 макарун тегін қорабы' },
  'hm-2-desc':  { en: 'Free box of 6 assorted macarons',ru: 'Коробка из 6 ассорти макарунов',     kz: '6 ассорти макарун қорабы' },
  'ql-1-title': { en: '15% Discount on Pastries',       ru: 'Скидка 15% на выпечку',             kz: 'Пісірілгенге 15% жеңілдік' },
  'ql-1-desc':  { en: '15% off any pastry at Qulpynai', ru: 'Скидка 15% в любом Qulpynai',       kz: 'Кез келген Qulpynai-да 15%' },
  'ql-2-title': { en: 'Free Samsa',                     ru: 'Бесплатная самса',                  kz: 'Тегін самса' },
  'ql-2-desc':  { en: 'Free samsa with any drink',      ru: 'Бесплатная самса при покупке напитка', kz: 'Сусын алғанда тегін самса' },
  'pn-1-title': { en: 'Free Croissant',                 ru: 'Бесплатный круассан',               kz: 'Тегін круассан' },
  'pn-1-desc':  { en: 'Fresh Spanish-style croissant',  ru: 'Свежий круассан в испанском стиле', kz: 'Испандық стильдегі жаңа круассан' },
  'pn-2-title': { en: '20% off Artisan Bread',          ru: 'Скидка 20% на ремесленный хлеб',    kz: 'Нанға 20% жеңілдік' },
  'pn-2-desc':  { en: '20% off sourdough bread',        ru: 'Скидка 20% на любой хлеб на закваске', kz: 'Ашытқы нанға 20%' },
  'mr-1-title': { en: 'Free Espresso',                  ru: 'Бесплатный эспрессо',               kz: 'Тегін эспрессо' },
  'mr-1-desc':  { en: 'Free espresso or americano',     ru: 'Эспрессо или американо в подарок',  kz: 'Тегін эспрессо немесе американо' },
  'mr-2-title': { en: '2-for-1 Cakes',                  ru: '2 торта по цене 1',                 kz: '1 бағасына 2 торт' },
  'mr-2-desc':  { en: 'Buy one slice, get one free',    ru: 'Один кусок — второй бесплатно',     kz: 'Бір кесім — екіншісі тегін' },
  'tt-1-title': { en: '25% off Custom Cakes',           ru: 'Скидка 25% на торты на заказ',      kz: 'Тапсырыс тортына 25%' },
  'tt-1-desc':  { en: '25% off custom cake with delivery', ru: 'Торт на заказ со скидкой 25%',   kz: 'Жеткізумен тапсырыс тортына 25%' },
  'tt-2-title': { en: 'Free Delivery',                  ru: 'Бесплатная доставка',               kz: 'Тегін жеткізу' },
  'tt-2-desc':  { en: 'Free delivery across Kazakhstan', ru: 'Бесплатная доставка по Казахстану', kz: 'Қазақстан бойынша тегін жеткізу' },
  'pw-1-title': { en: '+5% Cashback Boost',             ru: 'Буст кэшбэка +5%',                  kz: '+5% кэшбэк бусты' },
  'pw-1-desc':  { en: 'Extra cashback on next purchase', ru: 'Дополнительные 5% кэшбэка',        kz: 'Келесі сатып алуда қосымша 5%' },
};

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORY_META: Record<Category, { label: string; color: string; bg: string; border: string }> = {
  DISCOUNT: { label: 'Скидка',   color: 'text-sky-400',    bg: 'bg-sky-500/10',    border: 'border-sky-500/25' },
  PRODUCT:  { label: 'Продукт',  color: 'text-emerald-400',bg: 'bg-emerald-500/10',border: 'border-emerald-500/25' },
  CASHBACK: { label: 'Кэшбэк',   color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/25' },
  SPECIAL:  { label: 'Особое',   color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/25' },
};

const CATEGORY_ICON: Record<Category, typeof TagIcon> = {
  DISCOUNT: TagIcon,
  PRODUCT:  GiftIcon,
  CASHBACK: SparklesIcon,
  SPECIAL:  SparklesIcon,
};

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'all',        label: 'Все' },
  { id: 'affordable', label: 'Доступные' },
  { id: 'DISCOUNT',   label: 'Скидки' },
  { id: 'PRODUCT',    label: 'Продукты' },
  { id: 'SPECIAL',    label: 'Особые' },
  { id: 'CASHBACK',   label: 'Кэшбэк' },
];

// ─── Types ───────────────────────────────────────────────────────────────────

interface IssuedCoupon {
  code: string;
  reward: Reward;
  partner: Partner;
  expiresAt: string;
  daysLeft: number;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CustomerRewards() {
  const wallet = useTonWallet();
  const { i18n } = useTranslation();
  const lang = (i18n.language as 'en' | 'ru' | 'kz') || 'ru';

  const { addCoupon, setCoupons, sweetBalance, setSweetBalance, activeCoupons, token } = useAuthStore();

  const [partnerFilter, setPartnerFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<FilterTab>('all');
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [sheet, setSheet] = useState<IssuedCoupon | null>(null);
  const [showMyCoupons, setShowMyCoupons] = useState(false);

  const getText = (key: string): string =>
    TEXTS[key]?.[lang] ?? TEXTS[key]?.en ?? key;

  // ── Filtered + sorted reward list ──────────────────────────────
  const visibleRewards = useMemo(() => {
    let list = REWARDS;

    if (partnerFilter) {
      list = list.filter(r => r.partnerId === partnerFilter);
    }

    if (categoryFilter === 'affordable') {
      list = list.filter(r => r.pointsRequired <= sweetBalance);
    } else if (categoryFilter !== 'all') {
      list = list.filter(r => r.category === categoryFilter);
    }

    // Sort: affordable first, then by cost ascending
    return [...list].sort((a, b) => {
      const aAfford = a.pointsRequired <= sweetBalance ? 0 : 1;
      const bAfford = b.pointsRequired <= sweetBalance ? 0 : 1;
      if (aAfford !== bAfford) return aAfford - bAfford;
      return a.pointsRequired - b.pointsRequired;
    });
  }, [partnerFilter, categoryFilter, sweetBalance]);

  const affordableCount = REWARDS.filter(r => r.pointsRequired <= sweetBalance).length;

  // ── Reward → partner name map for DB sync ──────────────────────
  const REWARD_PARTNER_NAME = useMemo(() =>
    Object.fromEntries(REWARDS.map(r => [r.id, PARTNER_MAP[r.partnerId]?.name ?? 'Sweet Platform'])),
  []);

  // ── Sync coupons from DB once on mount / when token available ──
  useEffect(() => {
    if (!token) return;
    (api.coupons.list() as Promise<{ data: Array<{ code: string; rewardId: string; status: string }> }>)
      .then(res => {
        const active = res.data
          .filter(c => c.status === 'ACTIVE')
          .map(c => ({
            code: c.code,
            rewardTitleKey: `${c.rewardId}-title`,
            partnerName: REWARD_PARTNER_NAME[c.rewardId] ?? 'Sweet Platform',
          }));
        if (active.length > 0) setCoupons(active);
      })
      .catch(() => {});
  }, [token, setCoupons, REWARD_PARTNER_NAME]);

  // ── Redeem handler ─────────────────────────────────────────────
  const handleRedeem = async (reward: Reward) => {
    if (sweetBalance < reward.pointsRequired) {
      toast.error('Недостаточно SWEET');
      return;
    }

    setRedeeming(reward.id);
    try {
      const res = await api.coupons.create(
        reward.id,
        getText(reward.titleKey),
        reward.pointsRequired,
        reward.category,
      ) as {
        data: { code: string; expiresAt: string; daysLeft: number };
      };
      const { code, expiresAt, daysLeft } = res.data;

      const partner = PARTNER_MAP[reward.partnerId] ?? PARTNER_MAP['platform'];
      setSweetBalance(Math.max(0, sweetBalance - reward.pointsRequired));
      addCoupon({ code, rewardTitleKey: reward.titleKey, partnerName: partner.name });

      setSheet({ code, reward, partner, expiresAt, daysLeft });
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? 'Ошибка при выдаче купона');
    } finally {
      setRedeeming(null);
    }
  };

  // ── Sync balance from chain once when wallet connects (not on every render) ─
  useEffect(() => {
    if (!wallet) return;
    fetch(`https://testnet.tonapi.io/v2/accounts/${wallet.account.address}/jettons`)
      .then(r => r.json())
      .then(data => {
        const sweet = data.balances?.find(
          (b: { jetton: { address: string; decimals: number }; balance: string }) =>
            b.jetton?.address?.toLowerCase() ===
            '0:4d3a2278693a04f846b5d83a58e67066bb56ca4f46b1b7cd49992f4114f87c9c'
        );
        if (sweet) {
          const fresh = Number(BigInt(sweet.balance) / BigInt(10 ** sweet.jetton.decimals));
          setSweetBalance(fresh);
        }
      })
      .catch(() => {});
  }, [wallet?.account.address]);

  return (
    <div className="pb-28 text-white min-h-screen">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="mb-4">
        <div className="flex items-start justify-between mb-1">
          <h1 className="text-2xl font-black tracking-tight">Rewards</h1>

          {/* Balance pill */}
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1.5 bg-amber-400/10 border border-amber-400/20 rounded-full px-3 py-1.5">
              <SparklesIcon className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-sm font-black text-amber-400 tabular-nums">
                {sweetBalance.toLocaleString()}
              </span>
            </div>
            <span className="text-[10px] text-stone-600 mt-0.5 pr-1">SWEET</span>
          </div>
        </div>

        <p className="text-xs text-stone-500">
          {affordableCount > 0
            ? `${affordableCount} наград доступно прямо сейчас`
            : 'Накапливай SWEET — обменивай на награды'}
        </p>
      </div>

      {/* ── My Coupons strip ────────────────────────────────────── */}
      {activeCoupons.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setShowMyCoupons(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-amber-400/20 bg-amber-400/[0.05] hover:bg-amber-400/[0.08] transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <TicketIcon className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold text-amber-300">
                Мои купоны
              </span>
              <span className="text-[10px] bg-amber-400/20 text-amber-400 font-bold px-1.5 py-0.5 rounded-full">
                {activeCoupons.length}
              </span>
            </div>
            <ChevronRightIcon
              className={`w-4 h-4 text-amber-400/60 transition-transform ${showMyCoupons ? 'rotate-90' : ''}`}
            />
          </button>

          <AnimatePresence>
            {showMyCoupons && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-2 space-y-2">
                  {activeCoupons.map((c, i) => (
                    <MyCouponRow key={i} code={c.code} title={getText(c.rewardTitleKey)} partnerName={c.partnerName} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Category filter tabs ─────────────────────────────────── */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1 mb-3">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setCategoryFilter(tab.id)}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border whitespace-nowrap ${
              categoryFilter === tab.id
                ? 'bg-white text-black border-white'
                : 'bg-transparent text-stone-500 border-stone-800 hover:border-stone-600 hover:text-stone-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Partner filter pills ─────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1 mb-5">
        <PartnerPill
          label="Все партнёры"
          active={partnerFilter === null}
          onClick={() => setPartnerFilter(null)}
        />
        {PARTNERS.filter(p => p.id !== 'platform').map(p => (
          <PartnerPill
            key={p.id}
            label={p.shortName}
            logo={p.logo}
            emoji={p.emoji}
            active={partnerFilter === p.id}
            accent={p.accentFrom}
            onClick={() => setPartnerFilter(partnerFilter === p.id ? null : p.id)}
          />
        ))}
      </div>

      {/* ── Reward list ──────────────────────────────────────────── */}
      {visibleRewards.length === 0 ? (
        <EmptyState categoryFilter={categoryFilter} affordableCount={affordableCount} />
      ) : (
        <div className="space-y-3">
          {visibleRewards.map((reward) => (
            <RewardCard
              key={reward.id}
              reward={reward}
              partner={PARTNER_MAP[reward.partnerId] ?? PARTNER_MAP['platform']}
              balance={sweetBalance}
              getText={getText}
              isRedeeming={redeeming === reward.id}
              onRedeem={() => handleRedeem(reward)}
            />
          ))}
        </div>
      )}

      {/* ── Coupon bottom sheet ──────────────────────────────────── */}
      <CouponSheet coupon={sheet} getText={getText} onClose={() => setSheet(null)} />
    </div>
  );
}

// ─── RewardCard ───────────────────────────────────────────────────────────────

function RewardCard({
  reward,
  partner,
  balance,
  getText,
  isRedeeming,
  onRedeem,
}: {
  reward: Reward;
  partner: Partner;
  balance: number;
  getText: (key: string) => string;
  isRedeeming: boolean;
  onRedeem: () => void;
}) {
  const canAfford = balance >= reward.pointsRequired;
  const progress = Math.min(100, Math.round((balance / reward.pointsRequired) * 100));
  const need = reward.pointsRequired - balance;
  const catMeta = CATEGORY_META[reward.category];
  const CatIcon = CATEGORY_ICON[reward.category];

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border transition-colors ${
        canAfford
          ? 'border-stone-700 bg-stone-900'
          : 'border-stone-800 bg-stone-900/50'
      }`}
    >
      {/* Top color strip using inline style for dynamic color */}
      <div
        className="h-0.5 w-full"
        style={{ background: `linear-gradient(to right, ${partner.accentFrom}, transparent)` }}
      />

      <div className="p-4">
        {/* Partner + Category row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {partner.logo ? (
              <img src={partner.logo} alt={partner.name} className="w-5 h-5 rounded object-cover" />
            ) : (
              <span className="text-base leading-none">{partner.emoji}</span>
            )}
            <span className="text-[11px] font-semibold text-stone-500">{partner.shortName}</span>
            <span className="text-stone-700">·</span>
            <span className="text-[10px] text-stone-600">{partner.city}</span>
          </div>

          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${catMeta.bg} ${catMeta.color} ${catMeta.border}`}>
            <CatIcon className="w-2.5 h-2.5" />
            {catMeta.label}
          </span>
        </div>

        {/* Title + Description */}
        <p className={`text-[15px] font-bold leading-snug mb-1 ${canAfford ? 'text-white' : 'text-stone-400'}`}>
          {getText(reward.titleKey)}
        </p>
        <p className="text-[12px] text-stone-500 leading-relaxed mb-4 line-clamp-2">
          {getText(reward.descKey)}
        </p>

        {/* Bottom: cost + action */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              {canAfford ? (
                <CheckCircleSolid className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-stone-700 flex-shrink-0" />
              )}
              <span className={`text-sm font-black tabular-nums ${canAfford ? 'text-amber-400' : 'text-stone-500'}`}>
                {reward.pointsRequired.toLocaleString()}
              </span>
              <span className="text-[10px] text-stone-600 font-semibold">SWEET</span>
            </div>

            {/* Progress bar for unaffordable */}
            {!canAfford && (
              <div className="space-y-1">
                <div className="h-1 bg-stone-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-[10px] text-stone-600">
                  Ещё <span className="text-stone-400 font-semibold">{need.toLocaleString()} SWEET</span>
                </p>
              </div>
            )}
          </div>

          <button
            onClick={onRedeem}
            disabled={!canAfford || isRedeeming}
            className={`flex-shrink-0 flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              canAfford
                ? 'bg-amber-500 text-black hover:bg-amber-400 active:scale-95'
                : 'bg-stone-800/60 text-stone-600 cursor-not-allowed'
            }`}
          >
            {isRedeeming ? (
              <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin block" />
            ) : canAfford ? (
              <>
                <TicketIcon className="w-3.5 h-3.5" />
                Получить
              </>
            ) : (
              'Не хватает'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PartnerPill ──────────────────────────────────────────────────────────────

function PartnerPill({
  label,
  logo,
  emoji,
  active,
  accent,
  onClick,
}: {
  label: string;
  logo?: string | null;
  emoji?: string;
  active: boolean;
  accent?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={active && accent ? { borderColor: `${accent}50`, background: `${accent}18` } : undefined}
      className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border whitespace-nowrap ${
        active
          ? 'text-white'
          : 'bg-transparent text-stone-500 border-stone-800 hover:border-stone-600 hover:text-stone-300'
      }`}
    >
      {logo ? (
        <img src={logo} alt={label} className="w-3.5 h-3.5 rounded object-cover" />
      ) : emoji ? (
        <span className="text-[12px] leading-none">{emoji}</span>
      ) : null}
      {label}
    </button>
  );
}

// ─── MyCouponRow ──────────────────────────────────────────────────────────────

function MyCouponRow({ code, title, partnerName }: { code: string; title: string; partnerName: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Скопировано', { duration: 1000 });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-dashed border-amber-400/15 bg-amber-400/[0.03]">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-white truncate">{title}</p>
        <p className="text-[10px] text-stone-600">{partnerName}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="font-mono font-black text-sm text-amber-400 tracking-widest">{code}</span>
        <button onClick={handleCopy} className="p-1 hover:bg-stone-800/50 rounded-lg transition-colors">
          {copied
            ? <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
            : <ClipboardDocumentIcon className="w-3.5 h-3.5 text-stone-600" />
          }
        </button>
      </div>
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({ categoryFilter, affordableCount }: { categoryFilter: FilterTab; affordableCount: number }) {
  if (categoryFilter === 'affordable' && affordableCount === 0) {
    return (
      <div className="py-14 text-center">
        <GiftIcon className="w-12 h-12 text-stone-700 mx-auto mb-4" />
        <p className="text-sm font-semibold text-stone-400">Пока недостаточно SWEET</p>
        <p className="text-xs text-stone-600 mt-1 max-w-[200px] mx-auto">
          Совершай покупки у партнёров — получай кэшбэк токенами
        </p>
      </div>
    );
  }
  return (
    <div className="py-14 text-center">
      <GiftIcon className="w-10 h-10 text-stone-800 mx-auto mb-3" />
      <p className="text-sm text-stone-500">Нет наград в этой категории</p>
    </div>
  );
}

// ─── CouponSheet ──────────────────────────────────────────────────────────────

function CouponSheet({
  coupon,
  getText,
  onClose,
}: {
  coupon: IssuedCoupon | null;
  getText: (key: string) => string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!coupon) return;
    navigator.clipboard.writeText(coupon.code);
    setCopied(true);
    toast.success('Скопировано!', { duration: 1200 });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {coupon && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-50 flex justify-center"
          >
            <div className="w-full max-w-2xl bg-stone-950 border-t border-stone-800 rounded-t-3xl px-5 pt-4 pb-10">
              {/* Handle */}
              <div className="flex justify-center mb-5">
                <div className="w-10 h-1 rounded-full bg-white/15" />
              </div>

              {/* Success icon */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl"
                    style={{ background: `${coupon.partner.accentFrom}25`, border: `1px solid ${coupon.partner.accentFrom}40` }}>
                    {coupon.partner.emoji}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-stone-400">{coupon.partner.name}</p>
                    <p className="text-sm font-bold text-white">{getText(coupon.reward.titleKey)}</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-stone-800/50 rounded-xl transition-colors">
                  <XMarkIcon className="w-5 h-5 text-stone-500" />
                </button>
              </div>

              {/* The coupon code */}
              <div className="relative rounded-2xl overflow-hidden mb-4">
                {/* Ticket bg */}
                <div
                  className="absolute inset-0 opacity-[0.06]"
                  style={{ background: `linear-gradient(135deg, ${coupon.partner.accentFrom}, ${coupon.partner.accentTo})` }}
                />
                <div className="relative border border-dashed border-amber-400/30 rounded-2xl px-5 py-5">
                  {/* Notches */}
                  <div className="absolute top-1/2 -left-3 w-6 h-6 rounded-full bg-stone-950 -translate-y-1/2" />
                  <div className="absolute top-1/2 -right-3 w-6 h-6 rounded-full bg-stone-950 -translate-y-1/2" />

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-stone-600 uppercase tracking-widest mb-1.5">Код купона</p>
                      <p className="text-3xl font-black font-mono tracking-[0.2em] text-amber-400">
                        {coupon.code}
                      </p>
                    </div>
                    <button
                      onClick={handleCopy}
                      className="flex flex-col items-center gap-1 p-2.5 rounded-xl hover:bg-stone-800/50 transition-colors"
                    >
                      {copied
                        ? <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
                        : <ClipboardDocumentIcon className="w-5 h-5 text-stone-500" />
                      }
                      <span className="text-[9px] text-stone-600">{copied ? 'Скопировано' : 'Копировать'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="rounded-2xl bg-stone-900 border border-stone-800 divide-y divide-stone-800 mb-5">
                {[
                  { label: 'Потрачено',       value: `${coupon.reward.pointsRequired.toLocaleString()} SWEET`, accent: true },
                  { label: 'Действует',        value: `${coupon.daysLeft} дней`, warn: coupon.daysLeft <= 3 },
                  { label: 'Истекает',         value: new Date(coupon.expiresAt).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' }) },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-xs text-stone-500">{row.label}</span>
                    <span className={`text-xs font-semibold ${row.warn ? 'text-red-400' : row.accent ? 'text-amber-400' : 'text-stone-300'}`}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-stone-600 text-center mb-5">
                Покажи код кассиру в {coupon.partner.name}
              </p>

              <button
                onClick={onClose}
                className="w-full py-3.5 bg-amber-500 text-black font-bold rounded-2xl hover:bg-amber-400 transition-colors text-sm"
              >
                Готово
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
