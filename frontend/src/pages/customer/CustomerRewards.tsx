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
import confetti from 'canvas-confetti';
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
  { id: 'rakhat', name: 'Rakhat Sweets', shortName: 'Rakhat Sweets', logo: null, initial: 'RS', city: 'Алматы' },
  { id: 'astana', name: 'Astana Patisserie', shortName: 'Astana Patisserie', logo: null, initial: 'AP', city: 'Астана' },
  { id: 'almaty', name: 'Almaty Cakes', shortName: 'Almaty Cakes', logo: null, initial: 'AC', city: 'Алматы' },
  { id: 'sultan', name: 'Sultan Baursak', shortName: 'Sultan Baursak', logo: null, initial: 'SB', city: 'Астана' },
  { id: 'nomad', name: 'Nomad Confectionery', shortName: 'Nomad', logo: null, initial: 'NC', city: 'Алматы' },
  { id: 'cakelab', name: 'CakeLab Astana', shortName: 'CakeLab', logo: null, initial: 'CL', city: 'Астана' },
  { id: 'platform', name: 'Sweet Platform', shortName: 'Platform', logo: null, initial: 'SW', city: 'Все партнёры' },
];

const PARTNER_MAP = Object.fromEntries(PARTNERS.map(p => [p.id, p]));

const REWARDS: Reward[] = [
  { id: 'napoleon_disc', partnerId: 'rakhat', titleKey: 'rs-1-title', descKey: 'rs-1-desc', pointsRequired: 500, category: 'DISCOUNT', available: 200 },
  { id: 'vip_tasting', partnerId: 'rakhat', titleKey: 'rs-2-title', descKey: 'rs-2-desc', pointsRequired: 5000, category: 'SPECIAL', available: 10 },
  { id: 'eclair_free', partnerId: 'astana', titleKey: 'ap-1-title', descKey: 'ap-1-desc', pointsRequired: 1000, category: 'PRODUCT', available: 80 },
  { id: 'bday_upgrade', partnerId: 'astana', titleKey: 'ap-2-title', descKey: 'ap-2-desc', pointsRequired: 2000, category: 'SPECIAL', available: 30 },
  { id: 'coffee_pastry', partnerId: 'almaty', titleKey: 'ac-1-title', descKey: 'ac-1-desc', pointsRequired: 200, category: 'PRODUCT', available: 500 },
  { id: 'macaron_10', partnerId: 'almaty', titleKey: 'ac-2-title', descKey: 'ac-2-desc', pointsRequired: 100, category: 'DISCOUNT', available: 999 },
  { id: 'free_samsa', partnerId: 'sultan', titleKey: 'sb-1-title', descKey: 'sb-1-desc', pointsRequired: 250, category: 'PRODUCT', available: 150 },
  { id: 'baursak_box', partnerId: 'sultan', titleKey: 'sb-2-title', descKey: 'sb-2-desc', pointsRequired: 750, category: 'PRODUCT', available: 60 },
  { id: 'cashback_5k', partnerId: 'nomad', titleKey: 'nc-1-title', descKey: 'nc-1-desc', pointsRequired: 300, category: 'CASHBACK', available: 999 },
  { id: 'cashback_boost', partnerId: 'cakelab', titleKey: 'cl-1-title', descKey: 'cl-1-desc', pointsRequired: 500, category: 'CASHBACK', available: 999 },
  { id: 'pw-1', partnerId: 'platform', titleKey: 'pw-1-title', descKey: 'pw-1-desc', pointsRequired: 500, category: 'CASHBACK', available: 999 },
];

type Translations = Record<string, { en: string; ru: string; kz: string }>;
const TEXTS: Translations = {
  'rs-1-title': { en: '10% off Napoleon Cake', ru: 'Скидка 10% на торт Наполеон', kz: 'Наполеон тортына 10% жеңілдік' },
  'rs-1-desc': { en: 'Get 10% off our classic Napoleon layered cake. Valid on any size.', ru: 'Скидка 10% на классический торт Наполеон любого размера.', kz: 'Кез келген өлшемдегі классикалық Наполеон тортына 10%.' },
  'rs-2-title': { en: 'VIP Tasting Session', ru: 'VIP дегустация', kz: 'VIP дегустация' },
  'rs-2-desc': { en: 'Exclusive 1-hour tasting event at Rakhat Sweets HQ. 5 premium chocolate varieties.', ru: 'Эксклюзивная дегустация в штаб-квартире Rakhat Sweets. 5 видов премиум шоколада.', kz: 'Rakhat Sweets штаб-пәтерінде 1 сағаттық дегустация. 5 премиум шоколад түрі.' },
  'ap-1-title': { en: 'Free Eclair Set (Box of 4)', ru: 'Набор эклеров бесплатно (4 шт)', kz: 'Тегін эклер жинағы (4 дана)' },
  'ap-1-desc': { en: 'Complimentary set of 4 assorted eclairs — chocolate, vanilla, caramel, pistachio.', ru: 'Набор из 4 ассорти эклеров — шоколад, ваниль, карамель, фисташка.', kz: '4 ассорти эклер — шоколад, ваниль, карамель, фісташка.' },
  'ap-2-title': { en: 'Birthday Cake Upgrade', ru: 'Апгрейд торта на день рождения', kz: 'Туған күн тортын жаңарту' },
  'ap-2-desc': { en: 'Upgrade any standard birthday cake to a premium 3-tier design at no extra cost.', ru: 'Бесплатный апгрейд стандартного торта до трёхъярусного премиум-дизайна.', kz: 'Стандартты тортты 3 қабатты премиум дизайнға тегін жаңарту.' },
  'ac-1-title': { en: 'Free Coffee with Any Pastry', ru: 'Бесплатный кофе к выпечке', kz: 'Пісірілгенге тегін кофе' },
  'ac-1-desc': { en: 'Enjoy a complimentary Americano or Latte when you purchase any pastry item.', ru: 'Бесплатный американо или латте при покупке любой выпечки.', kz: 'Кез келген пісірілген алғанда тегін американо немесе латте.' },
  'ac-2-title': { en: '10% Discount on Macarons', ru: 'Скидка 10% на макаруны', kz: 'Макарундарға 10% жеңілдік' },
  'ac-2-desc': { en: 'Save 10% on any macaron set. Mix and match your favourite flavours.', ru: 'Скидка 10% на любой набор макарунов. Выбирайте любимые вкусы.', kz: 'Кез келген макарун жинағына 10%. Сүйікті дәмдеріңізді таңдаңыз.' },
  'sb-1-title': { en: 'Free Samsa with Drink', ru: 'Бесплатная самса с напитком', kz: 'Сусынмен тегін самса' },
  'sb-1-desc': { en: 'Get a free traditional samsa with any hot drink purchase.', ru: 'Бесплатная традиционная самса при покупке любого горячего напитка.', kz: 'Кез келген ыстық сусын алғанда тегін дәстүрлі самса.' },
  'sb-2-title': { en: 'Free Baursak Gift Box', ru: 'Подарочный набор баурсаков', kz: 'Тегін бауырсақ жинағы' },
  'sb-2-desc': { en: 'Traditional Kazakh baursak assortment — plain, honey-glazed, and savoury — in a festive gift box.', ru: 'Ассорти баурсаков — классические, медовые и солёные — в подарочной коробке.', kz: 'Бауырсақ ассортісі — классикалық, балды және тұзды — сыйлық қорабында.' },
  'nc-1-title': { en: '5% Cashback on orders over 5,000 KZT', ru: 'Кэшбэк 5% на заказы от 5,000 ₸', kz: '5,000 ₸ асатын тапсырыстарға 5% кэшбэк' },
  'nc-1-desc': { en: 'Receive 5% cashback in loyalty points on any single order exceeding 5,000 KZT.', ru: '5% кэшбэк баллами за любой заказ свыше 5,000 ₸.', kz: '5,000 ₸ асатын кез келген тапсырысқа 5% кэшбэк балдар.' },
  'cl-1-title': { en: '+5% Cashback Boost (Next Purchase)', ru: 'Буст кэшбэка +5% (след. покупка)', kz: '+5% кэшбэк бусты (келесі сатып алу)' },
  'cl-1-desc': { en: 'Activate a one-time 5% extra cashback multiplier on your very next transaction.', ru: 'Активируйте одноразовый буст +5% кэшбэка на следующую покупку.', kz: 'Келесі сатып алуда бір реттік +5% қосымша кэшбэк.' },
  'pw-1-title': { en: '+5% Cashback Boost', ru: 'Буст кэшбэка +5%', kz: '+5% кэшбэк бусты' },
  'pw-1-desc': { en: 'Extra cashback on next purchase', ru: 'Дополнительные 5% кэшбэка', kz: 'Келесі сатып алуда қосымша 5%' },
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
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
    } catch (err: unknown) {
      let message = t('rewards.claimError') || 'Error issuing coupon';
      if (err && typeof err === 'object') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const axiosErr = err as any;
        const serverMsg = axiosErr?.response?.data?.message || axiosErr?.response?.data?.error;
        const status = axiosErr?.response?.status;
        if (status === 400 && serverMsg?.toLowerCase().includes('balance')) {
          message = t('rewards.notEnoughSweet') || 'Insufficient SWEET balance';
        } else if (status === 401 || status === 403) {
          message = 'Session expired — please log in again';
        } else if (serverMsg) {
          message = serverMsg;
        } else if (axiosErr?.message === 'Network Error') {
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
