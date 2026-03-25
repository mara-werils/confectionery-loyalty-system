import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  TagIcon,
  GiftIcon,
  SparklesIcon,
  ArrowLeftIcon,
  TicketIcon,
} from '@heroicons/react/24/outline';
import { GlassCard } from '../../components/GlassCard';
import { useAuthStore } from '../../store/authStore';
import { useTonWallet } from '@tonconnect/ui-react';
import toast from 'react-hot-toast';

// ─── Real Partner Confectioneries in Kazakhstan ─────────────────
interface Partner {
  id: string;
  name: string;
  logo: string | null;
  color: string;
  city: string;
}

const partners: Partner[] = [
  {
    id: 'homemacaron',
    name: 'Home Macaron',
    logo: '/confectionary_logos/home_macaron.jpg',
    color: 'from-pink-500/20 to-pink-900/10',
    city: 'Алматы',
  },
  {
    id: 'qulpynai',
    name: 'Qulpynai',
    logo: null,
    color: 'from-amber-500/20 to-amber-900/10',
    city: 'Алматы · 25 филиалов',
  },
  {
    id: 'panaderia',
    name: 'Panaderia',
    logo: null,
    color: 'from-orange-500/20 to-orange-900/10',
    city: 'Алматы',
  },
  {
    id: 'marrone_rosso',
    name: 'Marrone Rosso',
    logo: null,
    color: 'from-red-500/20 to-red-900/10',
    city: 'Алматы · Астана',
  },
  {
    id: 'taptatti',
    name: 'TapTatti',
    logo: null,
    color: 'from-violet-500/20 to-violet-900/10',
    city: 'Астана · Доставка по КZ',
  },
];

// ─── Rewards per Partner (trilingual) ───────────────────────────
interface Reward {
  id: string;
  partnerId: string;
  titleKey: string;
  descKey: string;
  pointsRequired: number;
  category: 'DISCOUNT' | 'PRODUCT' | 'CASHBACK' | 'SPECIAL';
  icon: typeof TagIcon;
  available: number;
}

const rewardsData: Record<string, { en: string; ru: string; kz: string }> = {
  // Home Macaron
  'hm-1-title': { en: '10% Discount on Macarons', ru: 'Скидка 10% на макаруны', kz: 'Макарундарға 10% жеңілдік' },
  'hm-1-desc': { en: 'Get 10% off any macaron set at Home Macaron', ru: 'Скидка 10% на любой набор макарунов', kz: 'Кез келген макарун жинағына 10% жеңілдік' },
  'hm-2-title': { en: 'Free Box of 6 Macarons', ru: 'Бесплатная коробка из 6 макарунов', kz: '6 макарун тегін қорабы' },
  'hm-2-desc': { en: 'Redeem for a free box of 6 assorted macarons', ru: 'Обменяйте на бесплатную коробку из 6 ассорти макарунов', kz: '6 ассорти макарун тегін қорабына айырбастаңыз' },
  // Qulpynai
  'ql-1-title': { en: '15% Discount on Pastries', ru: 'Скидка 15% на выпечку', kz: 'Пісірілген тағамдарға 15% жеңілдік' },
  'ql-1-desc': { en: '15% off any pastry at any Qulpynai location', ru: 'Скидка 15% на выпечку в любом филиале Qulpynai', kz: 'Qulpynai кез келген филиалында тоқашқа 15% жеңілдік' },
  'ql-2-title': { en: 'Free Samsa', ru: 'Бесплатная самса', kz: 'Тегін самса' },
  'ql-2-desc': { en: 'Get a free samsa with any drink purchase', ru: 'Бесплатная самса при покупке любого напитка', kz: 'Кез келген сусын сатып алғанда тегін самса' },
  // Panaderia
  'pn-1-title': { en: 'Free Croissant', ru: 'Бесплатный круассан', kz: 'Тегін круассан' },
  'pn-1-desc': { en: 'A fresh Spanish-style croissant on the house', ru: 'Свежий круассан в испанском стиле в подарок', kz: 'Сыйлыққа испандық стильдегі жаңа круассан' },
  'pn-2-title': { en: '20% off Artisan Bread', ru: 'Скидка 20% на ремесленный хлеб', kz: 'Қолөнер нанына 20% жеңілдік' },
  'pn-2-desc': { en: '20% discount on any artisan sourdough bread', ru: 'Скидка 20% на любой ремесленный хлеб на закваске', kz: 'Ашытқыдағы кез келген қолөнер нанына 20% жеңілдік' },
  // Marrone Rosso
  'mr-1-title': { en: 'Free Espresso', ru: 'Бесплатный эспрессо', kz: 'Тегін эспрессо' },
  'mr-1-desc': { en: 'Enjoy a free espresso or americano at Marrone Rosso', ru: 'Бесплатный эспрессо или американо в Marrone Rosso', kz: 'Marrone Rosso-да тегін эспрессо немесе американо' },
  'mr-2-title': { en: '2-for-1 Cakes', ru: '2 торта по цене 1', kz: '1 бағасына 2 торт' },
  'mr-2-desc': { en: 'Buy one cake slice, get one free', ru: 'Купите один кусок торта и получите второй бесплатно', kz: 'Бір торт кесімін сатып алып, екіншісін тегін алыңыз' },
  // TapTatti
  'tt-1-title': { en: '25% off Custom Cakes', ru: 'Скидка 25% на торты на заказ', kz: 'Тапсырыс торттарына 25% жеңілдік' },
  'tt-1-desc': { en: '25% discount on any custom-order cake with delivery', ru: 'Скидка 25% на любой торт на заказ с доставкой', kz: 'Жеткізумен кез келген тапсырыс тортына 25% жеңілдік' },
  'tt-2-title': { en: 'Free Delivery', ru: 'Бесплатная доставка', kz: 'Тегін жеткізу' },
  'tt-2-desc': { en: 'Free delivery anywhere in Kazakhstan', ru: 'Бесплатная доставка по всему Казахстану', kz: 'Бүкіл Қазақстан бойынша тегін жеткізу' },
  // Platform-wide
  'pw-1-title': { en: '5% Cashback Boost', ru: 'Буст кэшбэка +5%', kz: '+5% кэшбэк бусты' },
  'pw-1-desc': { en: 'Get 5% extra cashback on your next purchase at any partner', ru: 'Дополнительные 5% кэшбэка на следующую покупку у любого партнёра', kz: 'Кез келген серіктесте келесі сатып алуда қосымша 5% кэшбэк' },
};

const rewards: Reward[] = [
  // Home Macaron
  { id: 'hm-1', partnerId: 'homemacaron', titleKey: 'hm-1-title', descKey: 'hm-1-desc', pointsRequired: 100, category: 'DISCOUNT', icon: TagIcon, available: 999 },
  { id: 'hm-2', partnerId: 'homemacaron', titleKey: 'hm-2-title', descKey: 'hm-2-desc', pointsRequired: 350, category: 'PRODUCT', icon: GiftIcon, available: 50 },
  // Qulpynai
  { id: 'ql-1', partnerId: 'qulpynai', titleKey: 'ql-1-title', descKey: 'ql-1-desc', pointsRequired: 150, category: 'DISCOUNT', icon: TagIcon, available: 500 },
  { id: 'ql-2', partnerId: 'qulpynai', titleKey: 'ql-2-title', descKey: 'ql-2-desc', pointsRequired: 200, category: 'PRODUCT', icon: GiftIcon, available: 100 },
  // Panaderia
  { id: 'pn-1', partnerId: 'panaderia', titleKey: 'pn-1-title', descKey: 'pn-1-desc', pointsRequired: 180, category: 'PRODUCT', icon: GiftIcon, available: 200 },
  { id: 'pn-2', partnerId: 'panaderia', titleKey: 'pn-2-title', descKey: 'pn-2-desc', pointsRequired: 300, category: 'DISCOUNT', icon: TagIcon, available: 80 },
  // Marrone Rosso
  { id: 'mr-1', partnerId: 'marrone_rosso', titleKey: 'mr-1-title', descKey: 'mr-1-desc', pointsRequired: 80, category: 'PRODUCT', icon: GiftIcon, available: 300 },
  { id: 'mr-2', partnerId: 'marrone_rosso', titleKey: 'mr-2-title', descKey: 'mr-2-desc', pointsRequired: 400, category: 'SPECIAL', icon: SparklesIcon, available: 50 },
  // TapTatti
  { id: 'tt-1', partnerId: 'taptatti', titleKey: 'tt-1-title', descKey: 'tt-1-desc', pointsRequired: 500, category: 'DISCOUNT', icon: TagIcon, available: 100 },
  { id: 'tt-2', partnerId: 'taptatti', titleKey: 'tt-2-title', descKey: 'tt-2-desc', pointsRequired: 250, category: 'SPECIAL', icon: SparklesIcon, available: 300 },
  // Platform-wide
  { id: 'pw-1', partnerId: 'platform', titleKey: 'pw-1-title', descKey: 'pw-1-desc', pointsRequired: 500, category: 'CASHBACK', icon: SparklesIcon, available: 999 },
];

export default function CustomerRewards() {
  const navigate = useNavigate();
  const wallet = useTonWallet();
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'en' | 'ru' | 'kz';
  const { spentPoints, addSpentPoints, addCoupon } = useAuthStore();

  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [coupon, setCoupon] = useState<{ code: string; reward: Reward; partner: Partner | null } | null>(null);
  const [actualBalance, setActualBalance] = useState<number>(0);

  // Fetch real balance to check affordability
  useEffect(() => {
    const fetchBal = async () => {
      if (!wallet) return;
      try {
        const res = await fetch(`https://testnet.tonapi.io/v2/accounts/${wallet.account.address}/jettons`);
        const data = await res.json();
        const sweet = data.balances?.find((b: { jetton: { address: string; decimals: number }; balance: string }) => 
          b.jetton?.address?.toLowerCase() === '0:4d3a2278693a04f846b5d83a58e67066bb56ca4f46b1b7cd49992f4114f87c9c'
        );
        if (sweet) {
          const raw = Number(BigInt(sweet.balance) / BigInt(10 ** sweet.jetton.decimals));
          setActualBalance(Math.max(0, raw - spentPoints));
        }
      } catch (e) {
        console.warn('Failed to fetch actual balance', e);
      }
    };
    fetchBal();
  }, [wallet, spentPoints]);

  const getRewardText = (key: string) => {
    return rewardsData[key]?.[lang] || rewardsData[key]?.en || key;
  };

  const filteredRewards = selectedPartner
    ? rewards.filter(r => r.partnerId === selectedPartner)
    : rewards;

  const getPartner = (id: string) => partners.find(p => p.id === id) || null;

  const handleRedeem = async (reward: Reward) => {
    if (actualBalance < reward.pointsRequired) {
      toast.error(t('rewards.insufficientBalance') || 'Недостаточно SWEET для покупки!');
      return;
    }

    setRedeeming(reward.id);
    await new Promise(r => setTimeout(r, 1500));
    
    // Deduct points locally for MVP illusion
    addSpentPoints(reward.pointsRequired);

    const partner = getPartner(reward.partnerId);
    const code = 'SWT-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Save to global state so it appears on Dashboard
    addCoupon({
      code,
      rewardTitleKey: reward.titleKey,
      partnerName: partner?.name || 'Platform'
    });

    setCoupon({ code, reward, partner });
    setRedeeming(null);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 pb-24 text-white">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <button
          onClick={() => navigate('/customer/dashboard')}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          {t('rewards.backToDashboard')}
        </button>
        <h1 className="text-3xl font-bold tracking-tight">{t('rewards.title')}</h1>
        <p className="text-zinc-400 mt-1 text-sm">{t('rewards.subtitle')}</p>
      </motion.div>

      {/* Partner filter tabs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex gap-2 overflow-x-auto no-scrollbar mb-6 -mx-4 px-4 pb-2"
      >
        <button
          onClick={() => setSelectedPartner(null)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 border ${
            !selectedPartner
              ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.15)]'
              : 'bg-zinc-900/50 text-zinc-400 border-white/5 hover:border-white/15'
          }`}
        >
          {t('rewards.allPartners')}
        </button>
        {partners.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedPartner(p.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 border ${
              selectedPartner === p.id
                ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.15)]'
                : 'bg-zinc-900/50 text-zinc-400 border-white/5 hover:border-white/15'
            }`}
          >
            {p.logo && (
              <img src={p.logo} alt={p.name} className="w-5 h-5 rounded object-cover" />
            )}
            {p.name}
          </button>
        ))}
      </motion.div>

      {/* Grouped rewards */}
      <div className="space-y-6">
        {selectedPartner ? (
          <RewardGroup
            partner={getPartner(selectedPartner)}
            rewards={filteredRewards}
            getRewardText={getRewardText}
            redeeming={redeeming}
            onRedeem={handleRedeem}
            t={t}
          />
        ) : (
          <>
            {partners.map((partner) => {
              const partnerRewards = rewards.filter(r => r.partnerId === partner.id);
              if (partnerRewards.length === 0) return null;
              return (
                <RewardGroup
                  key={partner.id}
                  partner={partner}
                  rewards={partnerRewards}
                  getRewardText={getRewardText}
                  redeeming={redeeming}
                  onRedeem={handleRedeem}
                  t={t}
                />
              );
            })}
            <RewardGroup
              partner={null}
              rewards={rewards.filter(r => r.partnerId === 'platform')}
              getRewardText={getRewardText}
              redeeming={redeeming}
              onRedeem={handleRedeem}
              t={t}
              isPlatform
            />
          </>
        )}
      </div>

      {/* Coupon Modal */}
      <AnimatePresence>
        {coupon && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-6"
            onClick={() => setCoupon(null)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-zinc-900 border border-white/10 rounded-3xl p-8 max-w-sm w-full text-center"
            >
              <div className="p-3 bg-green-500/10 rounded-2xl inline-block mb-4">
                <TicketIcon className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-1">{t('rewards.couponTitle')}</h3>
              <p className="text-xs text-zinc-400 mb-6">
                {t('rewards.couponReady')} {coupon.partner?.name || t('rewards.platformWide')}
              </p>

              <div className="bg-black/40 border border-dashed border-white/20 rounded-2xl py-5 px-6 mb-6">
                <p className="text-3xl font-mono font-extrabold tracking-[0.3em] text-white">
                  {coupon.code}
                </p>
              </div>

              <p className="text-xs text-zinc-500 mb-6">
                {getRewardText(coupon.reward.titleKey)} — {coupon.reward.pointsRequired} SWEET
              </p>

              <button
                onClick={() => setCoupon(null)}
                className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors text-sm"
              >
                {t('rewards.close')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Reward Group Component ─────────────────────────────────────
function RewardGroup({
  partner,
  rewards,
  getRewardText,
  redeeming,
  onRedeem,
  t,
  isPlatform,
}: {
  partner: Partner | null;
  rewards: Reward[];
  getRewardText: (key: string) => string;
  redeeming: string | null;
  onRedeem: (r: Reward) => void;
  t: (key: string) => string;
  isPlatform?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Partner header */}
      <div className="flex items-center gap-3 mb-3">
        {partner?.logo ? (
          <img src={partner.logo} alt={partner.name} className="w-8 h-8 rounded-lg object-cover ring-1 ring-white/10" />
        ) : (
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${partner?.color || 'from-zinc-500/20 to-zinc-900/10'} flex items-center justify-center ring-1 ring-white/10`}>
            <span className="text-xs font-bold text-white/80">
              {isPlatform ? '⚡' : partner?.name?.charAt(0) || '?'}
            </span>
          </div>
        )}
        <div>
          <h2 className="text-sm font-bold text-zinc-300 tracking-tight">
            {isPlatform ? t('rewards.platformWide') : partner?.name}
          </h2>
          {partner?.city && (
            <p className="text-[10px] text-zinc-500">{partner.city}</p>
          )}
        </div>
      </div>

      {/* Rewards list */}
      <div className="space-y-2">
        {rewards.map((reward) => (
          <GlassCard key={reward.id} className="p-4 border border-white/5">
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-xl ring-1 ring-white/10 shrink-0 bg-gradient-to-br ${partner?.color || 'from-zinc-500/20 to-zinc-900/10'}`}>
                <reward.icon className="w-4 h-4 text-zinc-200" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-white text-sm">{getRewardText(reward.titleKey)}</h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">{getRewardText(reward.descKey)}</p>
                  </div>
                  <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-1 rounded-lg font-mono text-zinc-300 whitespace-nowrap shrink-0">
                    {reward.pointsRequired} SWEET
                  </span>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[10px] text-zinc-500">
                    {reward.available} {t('rewards.available')}
                  </span>
                  <button
                    onClick={() => onRedeem(reward)}
                    disabled={redeeming === reward.id}
                    className="px-4 py-1.5 bg-white text-black text-xs font-bold rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-40"
                  >
                    {redeeming === reward.id ? (
                      <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    ) : (
                      t('rewards.redeem')
                    )}
                  </button>
                </div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </motion.div>
  );
}
