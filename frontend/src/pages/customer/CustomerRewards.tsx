import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  TagIcon,
  GiftIcon,
  CrownIcon,
  StarIcon,
  TicketIcon,
  ClipboardTextIcon,
  CheckIcon,
  XIcon,
  CaretDownIcon,
  CheckCircleIcon as CheckCircleSolid,
} from '@phosphor-icons/react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuthStore } from '../../store/authStore';
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
  CASHBACK: TagIcon,
  SPECIAL: CrownIcon,
};

// Category color palette
const CATEGORY_COLOR: Record<Category, { color: string; bg: string }> = {
  DISCOUNT: { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  PRODUCT:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  CASHBACK: { color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  SPECIAL:  { color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
};

const FILTER_TABS: { id: FilterTab; labelKey: string }[] = [
  { id: 'all', labelKey: 'rewards.categories.all' },
  { id: 'affordable', labelKey: 'rewards.categories.affordable' },
  { id: 'DISCOUNT', labelKey: 'rewards.categories.discount' },
  { id: 'PRODUCT', labelKey: 'rewards.categories.product' },
  { id: 'SPECIAL', labelKey: 'rewards.categories.special' },
  { id: 'CASHBACK', labelKey: 'rewards.categories.cashback' },
];

// Stagger variants
const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

// ─── Main component ─────────────────────────────────────────────────────────

export default function CustomerRewards() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language as 'en' | 'ru' | 'kz') || 'ru';

  const { addCoupon, setCoupons, sweetBalance, setSweetBalance, activeCoupons, token } = useAuthStore();

  const [partnerFilter, setPartnerFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<FilterTab>('all');
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [sheet, setSheet] = useState<IssuedCoupon | null>(null);
  const [showMyCoupons, setShowMyCoupons] = useState(false);

  const getText = (key: string): string => TEXTS[key]?.[lang] ?? TEXTS[key]?.en ?? TEXTS[key.toLowerCase()]?.[lang] ?? TEXTS[key.toLowerCase()]?.en ?? key;

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
    (api.coupons.list() as Promise<{ data: Array<{ code: string; rewardId: string; rewardTitle?: string; status: string }> }>)
      .then(res => {
        const active = res.data
          .filter(c => c.status === 'ACTIVE')
          .map(c => ({
            code: c.code,
            rewardTitleKey: `${c.rewardId.toLowerCase()}-title`,
            rewardTitle: c.rewardTitle || '',
            partnerName: REWARD_PARTNER_NAME[c.rewardId.toLowerCase()] ?? REWARD_PARTNER_NAME[c.rewardId] ?? 'Sweet Platform',
          }));
        if (active.length > 0) setCoupons(active);
      })
      .catch(() => {});
  }, [token, setCoupons, REWARD_PARTNER_NAME]);

  // Fetch DB balance as fallback only if store is empty (DB is source of truth)
  useEffect(() => {
    if (!token || sweetBalance > 0) return;
    (api.loyalty.getBalance() as Promise<{ data: { balance: number } }>)
      .then(res => {
        const bal = Number(res?.data?.balance || 0);
        if (bal > 0) setSweetBalance(bal);
      })
      .catch(() => {});
  }, [token]);

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
      addCoupon({ code, rewardTitleKey: reward.titleKey, rewardTitle: getText(reward.titleKey), partnerName: partner.name });
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
    <div className="pb-28 min-h-screen" style={{ color: 'var(--sweet-text)' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
        className="mb-5"
      >
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--sweet-text)' }}>
            {t('rewards.title')}
          </h1>
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.12, duration: 0.32 }}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
            style={{
              background: 'var(--sweet-accent-dim)',
              border: '1px solid var(--sweet-accent-dim)',
            }}
          >
            <StarIcon className="w-3.5 h-3.5" style={{ color: 'var(--sweet-accent)' }} />
            <span className="text-sm font-black tabular-nums" style={{ color: 'var(--sweet-accent)' }}>
              {sweetBalance.toLocaleString()}
            </span>
          </motion.div>
        </div>
        <p className="text-xs" style={{ color: 'var(--sweet-text-muted)' }}>
          {affordableCount > 0
            ? t('rewards.availableNow', { count: affordableCount })
            : t('rewards.accumulateSweet')}
        </p>
      </motion.div>

      {/* ── My Coupons ─────────────────────────────────────────────────────── */}
      {activeCoupons.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.35 }}
          className="mb-5"
        >
          <button
            onClick={() => setShowMyCoupons(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-colors"
            style={{
              background: 'var(--sweet-card)',
              border: '1px solid var(--sweet-border)',
            }}
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
            <motion.div
              animate={{ rotate: showMyCoupons ? 180 : 0 }}
              transition={{ duration: 0.22 }}
            >
              <CaretDownIcon className="w-4 h-4" style={{ color: 'var(--sweet-text-muted)' }} />
            </motion.div>
          </button>
          <AnimatePresence>
            {showMyCoupons && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="pt-2 space-y-2">
                  {activeCoupons.map((c, i) => {
                    const resolved = getText(c.rewardTitleKey);
                    const title = resolved !== c.rewardTitleKey ? resolved : (c.rewardTitle || resolved);
                    return <MyCouponRow key={i} code={c.code} title={title} partnerName={c.partnerName} />;
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ── Category filter ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1, duration: 0.32 }}
        className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1 mb-3"
      >
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
      </motion.div>

      {/* ── Partner filter ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.13, duration: 0.32 }}
        className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1 mb-5"
      >
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
      </motion.div>

      {/* ── Reward list ─────────────────────────────────────────────────────── */}
      {visibleRewards.length === 0 ? (
        <EmptyState categoryFilter={categoryFilter} affordableCount={affordableCount} />
      ) : (
        <motion.div
          className="space-y-3"
          variants={listVariants}
          initial="hidden"
          animate="show"
        >
          {visibleRewards.map((reward) => (
            <motion.div key={reward.id} variants={cardVariants}>
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
        </motion.div>
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
  const catColors = CATEGORY_COLOR[reward.category];

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all"
      style={{
        background: 'var(--sweet-card)',
        border: canAfford
          ? `1px solid ${catColors.color}35`
          : '1px solid var(--sweet-border)',
        opacity: canAfford ? 1 : 0.78,
        boxShadow: canAfford ? `0 4px 20px ${catColors.color}14` : 'none',
        transition: 'box-shadow 0.25s, border-color 0.25s, opacity 0.25s',
      }}
    >
      {/* Category accent strip */}
      {canAfford && (
        <div
          className="h-0.5 w-full"
          style={{ background: `linear-gradient(90deg, ${catColors.color}80, transparent)` }}
        />
      )}

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
            style={{ background: catColors.bg, color: catColors.color }}
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
                <CheckCircleSolid weight="fill" className="w-4 h-4 flex-shrink-0" style={{ color: '#22c55e' }} />
              ) : (
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ border: '2px solid var(--sweet-border)' }}
                />
              )}
              <span
                className="text-sm font-black tabular-nums"
                style={{ color: canAfford ? 'var(--sweet-accent)' : 'var(--sweet-text-muted)' }}
              >
                {reward.pointsRequired.toLocaleString()}
              </span>
              <span className="text-[10px] font-semibold" style={{ color: 'var(--sweet-text-faint)' }}>
                SWEET
              </span>
            </div>

            {!canAfford && (
              <div className="space-y-1">
                <div
                  className="h-1 rounded-full overflow-hidden"
                  style={{ background: 'var(--sweet-border)' }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full rounded-full"
                    style={{ background: 'var(--sweet-accent)' }}
                  />
                </div>
                <p className="text-[10px]" style={{ color: 'var(--sweet-text-faint)' }}>
                  {t('rewards.needMore', { amount: need.toLocaleString() })}
                </p>
              </div>
            )}
          </div>

          <motion.button
            onClick={onRedeem}
            disabled={!canAfford || isRedeeming}
            whileTap={canAfford && !isRedeeming ? { scale: 0.94 } : {}}
            className="flex-shrink-0 flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={canAfford
              ? {
                  background: 'var(--sweet-accent)',
                  color: 'var(--sweet-bg)',
                  boxShadow: '0 4px 12px rgba(245,158,11,0.25)',
                }
              : {
                  background: 'var(--sweet-border)',
                  color: 'var(--sweet-text-faint)',
                  cursor: 'not-allowed',
                }
            }
          >
            {isRedeeming ? (
              <span
                className="w-4 h-4 border-2 rounded-full animate-spin block"
                style={{ borderColor: 'var(--sweet-bg)', borderTopColor: 'transparent' }}
              />
            ) : canAfford ? (
              <>
                <TicketIcon className="w-3.5 h-3.5" />
                {t('rewards.claim')}
              </>
            ) : (
              t('rewards.unavailable')
            )}
          </motion.button>
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
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.94 }}
      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border whitespace-nowrap"
      style={active
        ? {
            background: 'var(--sweet-accent-dim)',
            borderColor: 'var(--sweet-accent)',
            color: 'var(--sweet-text)',
          }
        : {
            background: 'transparent',
            borderColor: 'var(--sweet-border)',
            color: 'var(--sweet-text-muted)',
          }
      }
    >
      {logo ? (
        <img src={logo} alt={label} className="w-3.5 h-3.5 rounded object-cover" />
      ) : initial ? (
        <span
          className="text-[10px] font-bold"
          style={{ color: active ? 'var(--sweet-accent)' : 'var(--sweet-text-faint)' }}
        >
          {initial}
        </span>
      ) : null}
      {label}
    </motion.button>
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
    <div
      className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl"
      style={{
        background: 'var(--sweet-card)',
        border: '1px dashed var(--sweet-border-light)',
      }}
    >
      <div className="min-w-0">
        <p className="text-xs font-semibold truncate" style={{ color: 'var(--sweet-text)' }}>{title}</p>
        <p className="text-[10px]" style={{ color: 'var(--sweet-text-muted)' }}>{partnerName}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span
          className="font-mono font-black text-sm tracking-widest"
          style={{ color: 'var(--sweet-accent)' }}
        >
          {code}
        </span>
        <button
          onClick={handleCopy}
          className="p-1.5 rounded-lg transition-colors"
          style={{
            background: 'var(--sweet-accent-dim)',
            color: 'var(--sweet-text-muted)',
          }}
        >
          {copied
            ? <CheckIcon className="w-3.5 h-3.5" style={{ color: '#22c55e' }} />
            : <ClipboardTextIcon className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

// ─── EmptyState ─────────────────────────────────────────────────────────────

function EmptyState({ categoryFilter, affordableCount }: { categoryFilter: FilterTab; affordableCount: number }) {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35 }}
      className="py-16 text-center rounded-2xl"
      style={{
        background: 'var(--sweet-card)',
        border: '1px solid var(--sweet-border)',
      }}
    >
      <div
        className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
        style={{ background: 'var(--sweet-accent-dim)' }}
      >
        <GiftIcon className="w-7 h-7" style={{ color: 'var(--sweet-accent)' }} />
      </div>
      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--sweet-text-secondary)' }}>
        {categoryFilter === 'affordable' && affordableCount === 0
          ? t('rewards.notEnoughSweet')
          : t('rewards.emptyTitle')}
      </p>
      {categoryFilter === 'affordable' && affordableCount === 0 && (
        <p
          className="text-xs mt-1 max-w-[200px] mx-auto"
          style={{ color: 'var(--sweet-text-muted)' }}
        >
          {t('rewards.earnSweetHint')}
        </p>
      )}
    </motion.div>
  );
}

// ─── CouponSheet ────────────────────────────────────────────────────────────

function CouponSheet({
  coupon,
  getText,
  onClose,
}: {
  coupon: IssuedCoupon | null;
  getText: (key: string) => string;
  onClose: () => void;
}) {
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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)' }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%', opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-28 left-0 right-0 z-[60] flex justify-center px-4"
          >
            <div
              className="w-full max-w-2xl max-h-[calc(100vh-9rem)] overflow-y-auto rounded-3xl px-5 pt-4 pb-6"
              style={{
                background: 'var(--sweet-card)',
                border: '1px solid var(--sweet-border)',
                boxShadow: '0 -8px 40px rgba(0,0,0,0.3)',
              }}
            >
              {/* Drag handle */}
              <div className="flex justify-center mb-5">
                <div
                  className="w-10 h-1 rounded-full"
                  style={{ background: 'var(--sweet-border-light)' }}
                />
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
                    <p className="text-xs font-medium" style={{ color: 'var(--sweet-text-secondary)' }}>
                      {coupon.partner.name}
                    </p>
                    <p className="text-sm font-bold" style={{ color: 'var(--sweet-text)' }}>
                      {getText(coupon.reward.titleKey)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl transition-colors"
                  style={{
                    background: 'var(--sweet-border)',
                    color: 'var(--sweet-text-muted)',
                  }}
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Coupon code ticket */}
              <div
                className="relative rounded-2xl overflow-hidden mb-4 px-5 py-5"
                style={{
                  border: '1px dashed var(--sweet-accent)',
                  background: 'var(--sweet-accent-dim)',
                }}
              >
                <div
                  className="absolute top-1/2 -left-3 w-6 h-6 rounded-full -translate-y-1/2"
                  style={{ background: 'var(--sweet-card)' }}
                />
                <div
                  className="absolute top-1/2 -right-3 w-6 h-6 rounded-full -translate-y-1/2"
                  style={{ background: 'var(--sweet-card)' }}
                />
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className="text-[10px] uppercase tracking-widest mb-1.5"
                      style={{ color: 'var(--sweet-text-muted)' }}
                    >
                      {t('rewards.couponCode')}
                    </p>
                    <motion.p
                      initial={{ scale: 0.92, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.15, duration: 0.3 }}
                      className="text-2xl font-black font-mono tracking-[0.15em]"
                      style={{ color: 'var(--sweet-accent)' }}
                    >
                      {coupon.code}
                    </motion.p>
                  </div>
                  <button
                    onClick={handleCopy}
                    className="flex flex-col items-center gap-1 p-2.5 rounded-xl transition-colors"
                    style={{
                      background: copied ? 'rgba(34,197,94,0.12)' : 'var(--sweet-card)',
                      border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'var(--sweet-border)'}`,
                    }}
                  >
                    {copied
                      ? <CheckIcon className="w-5 h-5" style={{ color: '#22c55e' }} />
                      : <ClipboardTextIcon className="w-5 h-5" style={{ color: 'var(--sweet-text-muted)' }} />}
                    <span className="text-[9px]" style={{ color: 'var(--sweet-text-faint)' }}>
                      {copied ? t('rewards.copied') : t('rewards.copy')}
                    </span>
                  </button>
                </div>
              </div>

              {/* QR Code */}
              <div
                className="flex flex-col items-center mb-4 py-5 rounded-2xl"
                style={{
                  background: 'var(--sweet-bg)',
                  border: '1px solid var(--sweet-border)',
                }}
              >
                <p
                  className="text-[10px] uppercase tracking-widest mb-3"
                  style={{ color: 'var(--sweet-text-muted)' }}
                >
                  {t('rewards.scanAtPartner') || 'Show this QR at the counter'}
                </p>
                <div className="bg-white p-3 rounded-2xl shadow-lg ring-1 ring-black/5">
                  <QRCodeSVG
                    value={`sweet-coupon:${coupon.code}`}
                    size={140}
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#000000"
                  />
                </div>
              </div>

              {/* Details rows */}
              <div
                className="rounded-2xl overflow-hidden mb-5"
                style={{
                  background: 'var(--sweet-bg)',
                  border: '1px solid var(--sweet-border)',
                }}
              >
                {[
                  {
                    label: t('rewards.spent'),
                    value: `${coupon.reward.pointsRequired.toLocaleString()} SWEET`,
                    accent: true,
                    warn: false,
                  },
                  {
                    label: t('rewards.validity'),
                    value: `${coupon.daysLeft} ${t('rewards.days')}`,
                    accent: false,
                    warn: coupon.daysLeft <= 3,
                  },
                  {
                    label: t('rewards.expires'),
                    value: new Date(coupon.expiresAt).toLocaleDateString(
                      i18n.language === 'kz' ? 'kk' : i18n.language === 'ru' ? 'ru' : 'en',
                      { day: 'numeric', month: 'long', year: 'numeric' }
                    ),
                    accent: false,
                    warn: false,
                  },
                ].map((row, i) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between px-4 py-2.5"
                    style={i > 0 ? { borderTop: '1px solid var(--sweet-border)' } : {}}
                  >
                    <span className="text-xs" style={{ color: 'var(--sweet-text-muted)' }}>
                      {row.label}
                    </span>
                    <span
                      className="text-xs font-semibold"
                      style={{
                        color: row.warn
                          ? '#ef4444'
                          : row.accent
                          ? 'var(--sweet-accent)'
                          : 'var(--sweet-text-secondary)',
                      }}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              <p
                className="text-[11px] text-center mb-5"
                style={{ color: 'var(--sweet-text-faint)' }}
              >
                {t('rewards.couponReady')} {coupon.partner.name}
              </p>

              <motion.button
                onClick={onClose}
                whileTap={{ scale: 0.97 }}
                className="w-full py-3.5 font-bold rounded-2xl transition-colors text-sm"
                style={{
                  background: 'var(--sweet-accent)',
                  color: 'var(--sweet-bg)',
                  boxShadow: '0 4px 16px rgba(245,158,11,0.25)',
                }}
              >
                {t('rewards.close')}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
