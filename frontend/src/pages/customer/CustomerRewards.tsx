import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  TagIcon,
  GiftIcon,
  SparklesIcon,
  TicketIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  XMarkIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import { QRCodeSVG } from 'qrcode.react';
import { useAuthStore } from '../../store/authStore';
import { useTonWallet } from '@tonconnect/ui-react';
import toast from 'react-hot-toast';

import { api } from '../../services/api';

// ─── Types ──────────────────────────────────────────────────────────────────

type Category = 'DISCOUNT' | 'PRODUCT' | 'CASHBACK' | 'SPECIAL';
type FilterTab = 'all' | 'affordable' | Category;

interface Partner {
  id: string;
  name: string;
  shortName: string;
  logo: string | null;
  initial: string;
  city: string;
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

interface IssuedCoupon {
  code: string;
  reward: Reward;
  partner: Partner;
  expiresAt: string;
  daysLeft: number;
}

// ─── Data ───────────────────────────────────────────────────────────────────

const PARTNERS: Partner[] = [
  { id: 'homemacaron', name: 'Home Macaron', shortName: 'Home Macaron', logo: '/confectionary_logos/home_macaron.jpg', initial: 'HM', city: 'Алматы' },
  { id: 'sweets_art', name: 'Sweets. The Art of Cake', shortName: 'Sweets Art', logo: null, initial: 'SA', city: 'Алматы' },
  { id: 'musmus', name: 'Дом десертов MUS-MUS', shortName: 'MUS-MUS', logo: null, initial: 'MM', city: 'Алматы' },
  { id: 'ocake', name: 'O-Cake', shortName: 'O-Cake', logo: null, initial: 'OC', city: 'Алматы' },
  { id: 'cakelab', name: 'CakeLab Astana', shortName: 'CakeLab', logo: null, initial: 'CL', city: 'Астана' },
  { id: 'patisserie', name: 'Patisserie de Luxe', shortName: 'Patisserie', logo: null, initial: 'PL', city: 'Алматы' },
  { id: 'hmgreen', name: 'Home Macaron GreenLine', shortName: 'HM GreenLine', logo: null, initial: 'HG', city: 'Алматы' },
  { id: 'marlen', name: 'Марлен', shortName: 'Марлен', logo: null, initial: 'М', city: 'Астана' },
  { id: 'platform', name: 'Sweet Platform', shortName: 'Platform', logo: null, initial: 'SW', city: 'Все партнёры' },
];

const PARTNER_MAP = Object.fromEntries(PARTNERS.map(p => [p.id, p]));

const REWARDS: Reward[] = [
  { id: 'hm-1', partnerId: 'homemacaron', titleKey: 'hm-1-title', descKey: 'hm-1-desc', pointsRequired: 100, category: 'DISCOUNT', available: 999 },
  { id: 'hm-2', partnerId: 'homemacaron', titleKey: 'hm-2-title', descKey: 'hm-2-desc', pointsRequired: 350, category: 'PRODUCT', available: 50 },
  { id: 'sa-1', partnerId: 'sweets_art', titleKey: 'sa-1-title', descKey: 'sa-1-desc', pointsRequired: 200, category: 'DISCOUNT', available: 200 },
  { id: 'sa-2', partnerId: 'sweets_art', titleKey: 'sa-2-title', descKey: 'sa-2-desc', pointsRequired: 500, category: 'SPECIAL', available: 30 },
  { id: 'mm-1', partnerId: 'musmus', titleKey: 'mm-1-title', descKey: 'mm-1-desc', pointsRequired: 150, category: 'PRODUCT', available: 300 },
  { id: 'mm-2', partnerId: 'musmus', titleKey: 'mm-2-title', descKey: 'mm-2-desc', pointsRequired: 400, category: 'DISCOUNT', available: 100 },
  { id: 'oc-1', partnerId: 'ocake', titleKey: 'oc-1-title', descKey: 'oc-1-desc', pointsRequired: 180, category: 'PRODUCT', available: 200 },
  { id: 'cl-1', partnerId: 'cakelab', titleKey: 'cl-1-title', descKey: 'cl-1-desc', pointsRequired: 300, category: 'DISCOUNT', available: 150 },
  { id: 'pl-1', partnerId: 'patisserie', titleKey: 'pl-1-title', descKey: 'pl-1-desc', pointsRequired: 250, category: 'PRODUCT', available: 80 },
  { id: 'hg-1', partnerId: 'hmgreen', titleKey: 'hg-1-title', descKey: 'hg-1-desc', pointsRequired: 120, category: 'DISCOUNT', available: 500 },
  { id: 'mr-1', partnerId: 'marlen', titleKey: 'mr-1-title', descKey: 'mr-1-desc', pointsRequired: 200, category: 'PRODUCT', available: 100 },
  { id: 'pw-1', partnerId: 'platform', titleKey: 'pw-1-title', descKey: 'pw-1-desc', pointsRequired: 500, category: 'CASHBACK', available: 999 },
];

type Translations = Record<string, { en: string; ru: string; kz: string }>;
const TEXTS: Translations = {
  'hm-1-title': { en: '10% Discount on Macarons', ru: 'Скидка 10% на макаруны', kz: 'Макарундарға 10% жеңілдік' },
  'hm-1-desc': { en: 'Get 10% off any macaron set at Home Macaron', ru: 'Скидка 10% на любой набор макарунов', kz: 'Кез келген макарун жинағына 10%' },
  'hm-2-title': { en: 'Free Box of 6 Macarons', ru: 'Бесплатная коробка из 6 макарунов', kz: '6 макарун тегін қорабы' },
  'hm-2-desc': { en: 'Free box of 6 assorted macarons', ru: 'Коробка из 6 ассорти макарунов в подарок', kz: '6 ассорти макарун қорабы тегін' },
  'sa-1-title': { en: '15% off Custom Cakes', ru: 'Скидка 15% на торты на заказ', kz: 'Тапсырыс торттарына 15% жеңілдік' },
  'sa-1-desc': { en: '15% off any custom cake order at Sweets. The Art of Cake', ru: 'Скидка 15% на любой торт на заказ', kz: 'Кез келген тапсырыс тортына 15%' },
  'sa-2-title': { en: 'VIP Cake Tasting', ru: 'VIP дегустация тортов', kz: 'VIP торт дегустациясы' },
  'sa-2-desc': { en: 'Exclusive tasting session with 5 premium cake varieties', ru: 'Эксклюзивная дегустация 5 видов премиум тортов', kz: '5 премиум торт түрін дегустациялау' },
  'mm-1-title': { en: 'Free Dessert of the Day', ru: 'Бесплатный десерт дня', kz: 'Тегін күннің десерті' },
  'mm-1-desc': { en: 'Get the dessert of the day for free at MUS-MUS', ru: 'Десерт дня бесплатно в MUS-MUS', kz: 'MUS-MUS-та күннің десерті тегін' },
  'mm-2-title': { en: '20% off Dessert Sets', ru: 'Скидка 20% на наборы десертов', kz: 'Десерт жинақтарына 20% жеңілдік' },
  'mm-2-desc': { en: '20% off any dessert set for 2 or more', ru: 'Скидка 20% на любой набор десертов от 2 шт', kz: '2 және одан көп десерт жинағына 20%' },
  'oc-1-title': { en: 'Free Mini Cake', ru: 'Бесплатный мини-торт', kz: 'Тегін мини-торт' },
  'oc-1-desc': { en: 'Complimentary mini cake with any order over 3,000 KZT', ru: 'Мини-торт в подарок при заказе от 3,000 ₸', kz: '3,000 ₸ асатын тапсырыста тегін мини-торт' },
  'cl-1-title': { en: '10% off 3D Cakes', ru: 'Скидка 10% на 3D торты', kz: '3D торттарға 10% жеңілдік' },
  'cl-1-desc': { en: '10% discount on any 3D custom cake at CakeLab', ru: 'Скидка 10% на любой 3D торт в CakeLab', kz: 'CakeLab-та кез келген 3D тортқа 10%' },
  'pl-1-title': { en: 'Free Eclair Set (4 pcs)', ru: 'Набор эклеров бесплатно (4 шт)', kz: 'Тегін эклер жинағы (4 дана)' },
  'pl-1-desc': { en: '4 assorted eclairs — chocolate, vanilla, caramel, pistachio', ru: '4 ассорти эклера — шоколад, ваниль, карамель, фисташка', kz: '4 ассорти эклер — шоколад, ваниль, карамель, фісташка' },
  'hg-1-title': { en: '10% off at GreenLine', ru: 'Скидка 10% в GreenLine', kz: 'GreenLine-да 10% жеңілдік' },
  'hg-1-desc': { en: '10% off any purchase at Home Macaron GreenLine', ru: 'Скидка 10% на любую покупку в Home Macaron GreenLine', kz: 'Home Macaron GreenLine-да кез келген сатып алуға 10%' },
  'mr-1-title': { en: 'Free Coffee with Pastry', ru: 'Бесплатный кофе к выпечке', kz: 'Пісірілгенге тегін кофе' },
  'mr-1-desc': { en: 'Free americano or latte with any pastry at Марлен', ru: 'Бесплатный американо или латте к любой выпечке', kz: 'Кез келген пісірілгенге тегін американо немесе латте' },
  'pw-1-title': { en: '+5% Cashback Boost', ru: 'Буст кэшбэка +5%', kz: '+5% кэшбэк бусты' },
  'pw-1-desc': { en: 'Extra cashback on next purchase at any partner', ru: 'Дополнительные 5% кэшбэка на следующую покупку', kz: 'Келесі сатып алуда қосымша 5% кэшбэк' },
};

const CATEGORY_ICON: Record<Category, typeof TagIcon> = {
  DISCOUNT: TagIcon,
  PRODUCT: GiftIcon,
  CASHBACK: SparklesIcon,
  SPECIAL: SparklesIcon,
};

const FILTER_TABS: { id: FilterTab; labelKey: string }[] = [
  { id: 'all', labelKey: 'rewards.categories.all' },
  { id: 'affordable', labelKey: 'rewards.categories.affordable' },
  { id: 'DISCOUNT', labelKey: 'rewards.categories.discount' },
  { id: 'PRODUCT', labelKey: 'rewards.categories.product' },
  { id: 'SPECIAL', labelKey: 'rewards.categories.special' },
  { id: 'CASHBACK', labelKey: 'rewards.categories.cashback' },
];

// ─── Main component ─────────────────────────────────────────────────────────

export default function CustomerRewards() {
  const wallet = useTonWallet();
  const { t, i18n } = useTranslation();
  const lang = (i18n.language as 'en' | 'ru' | 'kz') || 'ru';

  const { addCoupon, setCoupons, sweetBalance, setSweetBalance, activeCoupons, token } = useAuthStore();

  const [partnerFilter, setPartnerFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<FilterTab>('all');
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [sheet, setSheet] = useState<IssuedCoupon | null>(null);
  const [showMyCoupons, setShowMyCoupons] = useState(false);

  const getText = (key: string): string => TEXTS[key]?.[lang] ?? TEXTS[key]?.en ?? key;

  const visibleRewards = useMemo(() => {
    let list = REWARDS;
    if (partnerFilter) list = list.filter(r => r.partnerId === partnerFilter);
    if (categoryFilter === 'affordable') {
      list = list.filter(r => r.pointsRequired <= sweetBalance);
    } else if (categoryFilter !== 'all') {
      list = list.filter(r => r.category === categoryFilter);
    }
    return [...list].sort((a, b) => {
      const aOk = a.pointsRequired <= sweetBalance ? 0 : 1;
      const bOk = b.pointsRequired <= sweetBalance ? 0 : 1;
      if (aOk !== bOk) return aOk - bOk;
      return a.pointsRequired - b.pointsRequired;
    });
  }, [partnerFilter, categoryFilter, sweetBalance]);

  const affordableCount = REWARDS.filter(r => r.pointsRequired <= sweetBalance).length;

  const REWARD_PARTNER_NAME = useMemo(() =>
    Object.fromEntries(REWARDS.map(r => [r.id, PARTNER_MAP[r.partnerId]?.name ?? 'Sweet Platform'])),
  []);

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
        if (sweet) setSweetBalance(Number(BigInt(sweet.balance) / BigInt(10 ** sweet.jetton.decimals)));
      })
      .catch(() => {});
  }, [wallet?.account.address]);

  const handleRedeem = async (reward: Reward) => {
    if (sweetBalance < reward.pointsRequired) {
      toast.error(t('rewards.notEnoughSweet'));
      return;
    }
    setRedeeming(reward.id);
    try {
      const res = await api.coupons.create(
        reward.id, getText(reward.titleKey), reward.pointsRequired, reward.category,
      ) as { data: { code: string; expiresAt: string; daysLeft: number } };
      const { code, expiresAt, daysLeft } = res.data;
      const partner = PARTNER_MAP[reward.partnerId] ?? PARTNER_MAP['platform'];
      setSweetBalance(Math.max(0, sweetBalance - reward.pointsRequired));
      addCoupon({ code, rewardTitleKey: reward.titleKey, partnerName: partner.name });
      setSheet({ code, reward, partner, expiresAt, daysLeft });
    } catch (err: unknown) {
      let message = t('rewards.claimError') || 'Error issuing coupon';
      if (err && typeof err === 'object') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const e = err as any;
        const status = e.status ?? e?.response?.status;
        const serverMsg = e.serverMessage ?? e?.response?.data?.message ?? e?.response?.data?.error;
        if (status === 400 && serverMsg?.toLowerCase().includes('balance')) {
          message = t('rewards.notEnoughSweet') || 'Insufficient SWEET balance';
        } else if (status === 401 || status === 403) {
          message = 'Session expired — please log in again';
        } else if (serverMsg) {
          message = serverMsg;
        } else if (e?.message === 'Network Error') {
          message = 'Cannot reach server — check your connection';
        }
      }
      toast.error(message);
    } finally {
      setRedeeming(null);
    }
  };

  return (
    <div className="pb-28 min-h-screen">

      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--sweet-text)' }}>
            {t('rewards.title')}
          </h1>
          <div
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
            style={{ background: 'var(--sweet-accent-dim)', border: '1px solid var(--sweet-accent-dim)' }}
          >
            <SparklesIcon className="w-3.5 h-3.5" style={{ color: 'var(--sweet-accent)' }} />
            <span className="text-sm font-black tabular-nums" style={{ color: 'var(--sweet-accent)' }}>
              {sweetBalance.toLocaleString()}
            </span>
          </div>
        </div>
        <p className="text-xs" style={{ color: 'var(--sweet-text-muted)' }}>
          {affordableCount > 0
            ? t('rewards.availableNow', { count: affordableCount })
            : t('rewards.accumulateSweet')}
        </p>
      </div>

      {/* My Coupons */}
      {activeCoupons.length > 0 && (
        <div className="mb-5">
          <button
            onClick={() => setShowMyCoupons(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-colors sweet-card"
          >
            <div className="flex items-center gap-2.5">
              <TicketIcon className="w-4 h-4" style={{ color: 'var(--sweet-accent)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--sweet-text)' }}>
                {t('rewards.myCoupons')}
              </span>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: 'var(--sweet-accent-dim)', color: 'var(--sweet-accent)' }}
              >
                {activeCoupons.length}
              </span>
            </div>
            <ChevronDownIcon
              className={`w-4 h-4 transition-transform ${showMyCoupons ? 'rotate-180' : ''}`}
              style={{ color: 'var(--sweet-text-muted)' }}
            />
          </button>
          <AnimatePresence>
            {showMyCoupons && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
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

      {/* Category filter */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1 mb-3">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setCategoryFilter(tab.id)}
            className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border whitespace-nowrap"
            style={categoryFilter === tab.id
              ? { background: 'var(--sweet-accent)', color: 'var(--sweet-bg)', borderColor: 'var(--sweet-accent)' }
              : { background: 'transparent', color: 'var(--sweet-text-muted)', borderColor: 'var(--sweet-border)' }
            }
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {/* Partner filter */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1 mb-5">
        <PartnerPill
          label={t('rewards.allPartners')}
          active={partnerFilter === null}
          onClick={() => setPartnerFilter(null)}
        />
        {PARTNERS.filter(p => p.id !== 'platform').map(p => (
          <PartnerPill
            key={p.id}
            label={p.shortName}
            logo={p.logo}
            initial={p.initial}
            active={partnerFilter === p.id}
            onClick={() => setPartnerFilter(partnerFilter === p.id ? null : p.id)}
          />
        ))}
      </div>

      {/* Reward list */}
      {visibleRewards.length === 0 ? (
        <EmptyState categoryFilter={categoryFilter} affordableCount={affordableCount} />
      ) : (
        <div className="space-y-3">
          {visibleRewards.map((reward, i) => (
            <motion.div
              key={reward.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
            >
              <RewardCard
                reward={reward}
                partner={PARTNER_MAP[reward.partnerId] ?? PARTNER_MAP['platform']}
                balance={sweetBalance}
                getText={getText}
                isRedeeming={redeeming === reward.id}
                onRedeem={() => handleRedeem(reward)}
              />
            </motion.div>
          ))}
        </div>
      )}

      <CouponSheet coupon={sheet} getText={getText} onClose={() => setSheet(null)} />
    </div>
  );
}

// ─── RewardCard ─────────────────────────────────────────────────────────────

function RewardCard({
  reward, partner, balance, getText, isRedeeming, onRedeem,
}: {
  reward: Reward; partner: Partner; balance: number;
  getText: (key: string) => string; isRedeeming: boolean; onRedeem: () => void;
}) {
  const { t } = useTranslation();
  const canAfford = balance >= reward.pointsRequired;
  const progress = Math.min(100, Math.round((balance / reward.pointsRequired) * 100));
  const need = reward.pointsRequired - balance;
  const CatIcon = CATEGORY_ICON[reward.category];

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all"
      style={{
        background: 'var(--sweet-card)',
        border: '1px solid var(--sweet-border)',
        opacity: canAfford ? 1 : 0.7,
      }}
    >
      <div className="p-4">
        {/* Partner + Category */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {partner.logo ? (
              <img src={partner.logo} alt={partner.name} className="w-5 h-5 rounded object-cover" />
            ) : (
              <div
                className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold"
                style={{ background: 'var(--sweet-accent-dim)', color: 'var(--sweet-accent)' }}
              >
                {partner.initial}
              </div>
            )}
            <span className="text-[11px] font-medium" style={{ color: 'var(--sweet-text-secondary)' }}>
              {partner.shortName}
            </span>
          </div>

          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ background: 'var(--sweet-accent-dim)', color: 'var(--sweet-text-secondary)' }}
          >
            <CatIcon className="w-2.5 h-2.5" />
            {t(`rewards.category${reward.category.charAt(0) + reward.category.slice(1).toLowerCase()}`)}
          </span>
        </div>

        {/* Title + Description */}
        <p className="text-[15px] font-bold leading-snug mb-1" style={{ color: 'var(--sweet-text)' }}>
          {getText(reward.titleKey)}
        </p>
        <p className="text-[12px] leading-relaxed mb-4 line-clamp-2" style={{ color: 'var(--sweet-text-muted)' }}>
          {getText(reward.descKey)}
        </p>

        {/* Cost + Action */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              {canAfford ? (
                <CheckCircleSolid className="w-4 h-4 flex-shrink-0" style={{ color: '#22c55e' }} />
              ) : (
                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ border: '2px solid var(--sweet-border)' }} />
              )}
              <span className="text-sm font-black tabular-nums" style={{ color: canAfford ? 'var(--sweet-accent)' : 'var(--sweet-text-muted)' }}>
                {reward.pointsRequired.toLocaleString()}
              </span>
              <span className="text-[10px] font-semibold" style={{ color: 'var(--sweet-text-faint)' }}>SWEET</span>
            </div>

            {!canAfford && (
              <div className="space-y-1">
                <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--sweet-border)' }}>
                  <div className="h-full rounded-full" style={{ width: `${progress}%`, background: 'var(--sweet-accent)' }} />
                </div>
                <p className="text-[10px]" style={{ color: 'var(--sweet-text-faint)' }}>
                  {t('rewards.needMore', { amount: need.toLocaleString() })}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={onRedeem}
            disabled={!canAfford || isRedeeming}
            className="flex-shrink-0 flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95"
            style={canAfford
              ? { background: 'var(--sweet-accent)', color: 'var(--sweet-bg)' }
              : { background: 'var(--sweet-border)', color: 'var(--sweet-text-faint)', cursor: 'not-allowed' }
            }
          >
            {isRedeeming ? (
              <span className="w-4 h-4 border-2 rounded-full animate-spin block" style={{ borderColor: 'var(--sweet-bg)', borderTopColor: 'transparent' }} />
            ) : canAfford ? (
              <>
                <TicketIcon className="w-3.5 h-3.5" />
                {t('rewards.claim')}
              </>
            ) : (
              t('rewards.unavailable')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PartnerPill ────────────────────────────────────────────────────────────

function PartnerPill({
  label, logo, initial, active, onClick,
}: {
  label: string; logo?: string | null; initial?: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border whitespace-nowrap"
      style={active
        ? { background: 'var(--sweet-accent-dim)', borderColor: 'var(--sweet-accent)', color: 'var(--sweet-text)' }
        : { background: 'transparent', borderColor: 'var(--sweet-border)', color: 'var(--sweet-text-muted)' }
      }
    >
      {logo ? (
        <img src={logo} alt={label} className="w-3.5 h-3.5 rounded object-cover" />
      ) : initial ? (
        <span className="text-[10px] font-bold" style={{ color: 'var(--sweet-accent)' }}>{initial}</span>
      ) : null}
      {label}
    </button>
  );
}

// ─── MyCouponRow ────────────────────────────────────────────────────────────

function MyCouponRow({ code, title, partnerName }: { code: string; title: string; partnerName: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success(t('rewards.copied'), { duration: 1000 });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl sweet-card" style={{ borderStyle: 'dashed' }}>
      <div className="min-w-0">
        <p className="text-xs font-semibold truncate" style={{ color: 'var(--sweet-text)' }}>{title}</p>
        <p className="text-[10px]" style={{ color: 'var(--sweet-text-muted)' }}>{partnerName}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="font-mono font-black text-sm tracking-widest" style={{ color: 'var(--sweet-accent)' }}>{code}</span>
        <button onClick={handleCopy} className="p-1 rounded-lg transition-colors" style={{ color: 'var(--sweet-text-muted)' }}>
          {copied ? <CheckIcon className="w-3.5 h-3.5" style={{ color: '#22c55e' }} /> : <ClipboardDocumentIcon className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

// ─── EmptyState ─────────────────────────────────────────────────────────────

function EmptyState({ categoryFilter, affordableCount }: { categoryFilter: FilterTab; affordableCount: number }) {
  const { t } = useTranslation();
  return (
    <div className="py-14 text-center">
      <GiftIcon className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--sweet-text-faint)' }} />
      <p className="text-sm font-semibold" style={{ color: 'var(--sweet-text-secondary)' }}>
        {categoryFilter === 'affordable' && affordableCount === 0 ? t('rewards.notEnoughSweet') : t('rewards.emptyTitle')}
      </p>
      {categoryFilter === 'affordable' && affordableCount === 0 && (
        <p className="text-xs mt-1 max-w-[200px] mx-auto" style={{ color: 'var(--sweet-text-muted)' }}>
          {t('rewards.earnSweetHint')}
        </p>
      )}
    </div>
  );
}

// ─── CouponSheet ────────────────────────────────────────────────────────────

function CouponSheet({ coupon, getText, onClose }: { coupon: IssuedCoupon | null; getText: (key: string) => string; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!coupon) return;
    navigator.clipboard.writeText(coupon.code);
    setCopied(true);
    toast.success(t('rewards.copied'), { duration: 1200 });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {coupon && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="fixed bottom-28 left-0 right-0 z-[60] flex justify-center px-4"
          >
            <div
              className="w-full max-w-2xl max-h-[calc(100vh-9rem)] overflow-y-auto rounded-3xl px-5 pt-4 pb-6"
              style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}
            >
              <div className="flex justify-center mb-5">
                <div className="w-10 h-1 rounded-full" style={{ background: 'var(--sweet-border-light)' }} />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-bold"
                    style={{ background: 'var(--sweet-accent-dim)', color: 'var(--sweet-accent)' }}
                  >
                    {coupon.partner.initial}
                  </div>
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'var(--sweet-text-secondary)' }}>{coupon.partner.name}</p>
                    <p className="text-sm font-bold" style={{ color: 'var(--sweet-text)' }}>{getText(coupon.reward.titleKey)}</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 rounded-xl transition-colors">
                  <XMarkIcon className="w-5 h-5" style={{ color: 'var(--sweet-text-muted)' }} />
                </button>
              </div>

              {/* Coupon code */}
              <div
                className="relative rounded-2xl overflow-hidden mb-4 px-5 py-5"
                style={{ border: '1px dashed var(--sweet-accent)', background: 'var(--sweet-accent-dim)' }}
              >
                <div className="absolute top-1/2 -left-3 w-6 h-6 rounded-full -translate-y-1/2" style={{ background: 'var(--sweet-card)' }} />
                <div className="absolute top-1/2 -right-3 w-6 h-6 rounded-full -translate-y-1/2" style={{ background: 'var(--sweet-card)' }} />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--sweet-text-muted)' }}>{t('rewards.couponCode')}</p>
                    <p className="text-2xl font-black font-mono tracking-[0.15em]" style={{ color: 'var(--sweet-accent)' }}>
                      {coupon.code}
                    </p>
                  </div>
                  <button onClick={handleCopy} className="flex flex-col items-center gap-1 p-2.5 rounded-xl transition-colors">
                    {copied
                      ? <CheckIcon className="w-5 h-5" style={{ color: '#22c55e' }} />
                      : <ClipboardDocumentIcon className="w-5 h-5" style={{ color: 'var(--sweet-text-muted)' }} />}
                    <span className="text-[9px]" style={{ color: 'var(--sweet-text-faint)' }}>
                      {copied ? t('rewards.copied') : t('rewards.copy')}
                    </span>
                  </button>
                </div>
              </div>

              {/* QR Code for presenting at POS */}
              <div className="flex flex-col items-center mb-4 py-4 rounded-2xl" style={{ background: 'var(--sweet-bg)', border: '1px solid var(--sweet-border)' }}>
                <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: 'var(--sweet-text-muted)' }}>
                  {t('rewards.scanAtPartner') || 'Show this QR at the counter'}
                </p>
                <div className="bg-white p-3 rounded-2xl shadow-lg">
                  <QRCodeSVG
                    value={`sweet-coupon:${coupon.code}`}
                    size={140}
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#000000"
                  />
                </div>
              </div>

              {/* Details */}
              <div className="rounded-2xl overflow-hidden mb-5" style={{ background: 'var(--sweet-bg)', border: '1px solid var(--sweet-border)' }}>
                {[
                  { label: t('rewards.spent'), value: `${coupon.reward.pointsRequired.toLocaleString()} SWEET`, accent: true },
                  { label: t('rewards.validity'), value: `${coupon.daysLeft} ${t('rewards.days')}`, warn: coupon.daysLeft <= 3 },
                  { label: t('rewards.expires'), value: new Date(coupon.expiresAt).toLocaleDateString(i18n.language === 'kz' ? 'kk' : i18n.language === 'ru' ? 'ru' : 'en', { day: 'numeric', month: 'long', year: 'numeric' }) },
                ].map((row, i) => (
                  <div key={row.label} className="flex items-center justify-between px-4 py-2.5" style={i > 0 ? { borderTop: '1px solid var(--sweet-border)' } : {}}>
                    <span className="text-xs" style={{ color: 'var(--sweet-text-muted)' }}>{row.label}</span>
                    <span className="text-xs font-semibold" style={{ color: row.warn ? '#ef4444' : row.accent ? 'var(--sweet-accent)' : 'var(--sweet-text-secondary)' }}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-center mb-5" style={{ color: 'var(--sweet-text-faint)' }}>
                {t('rewards.couponReady')} {coupon.partner.name}
              </p>

              <button
                onClick={onClose}
                className="w-full py-3.5 font-bold rounded-2xl transition-colors text-sm"
                style={{ background: 'var(--sweet-accent)', color: 'var(--sweet-bg)' }}
              >
                {t('rewards.close')}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
