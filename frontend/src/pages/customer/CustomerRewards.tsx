import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  TagIcon,
  GiftIcon,
  SparklesIcon,
  ArrowLeftIcon,
  TicketIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { GlassCard } from '../../components/GlassCard';

// ─── Partner Confectioneries ────────────────────────────────────
interface Partner {
  id: string;
  name: string;
  logo: string | null;  // path in /confectionary_logos/
  color: string;
}

const partners: Partner[] = [
  {
    id: 'homemacaron',
    name: 'Home Macaron',
    logo: '/confectionary_logos/home_macaron.jpg',
    color: 'from-pink-500/20 to-pink-900/10',
  },
  {
    id: 'shokoladnitsa',
    name: 'Шоколадница',
    logo: null,
    color: 'from-amber-500/20 to-amber-900/10',
  },
  {
    id: 'pieceofcake',
    name: 'Piece of Cake',
    logo: null,
    color: 'from-violet-500/20 to-violet-900/10',
  },
  {
    id: 'coffeemania',
    name: 'Coffee Mania',
    logo: null,
    color: 'from-orange-500/20 to-orange-900/10',
  },
  {
    id: 'bonapart',
    name: 'Bonapart',
    logo: null,
    color: 'from-emerald-500/20 to-emerald-900/10',
  },
];

// ─── Rewards per Partner ────────────────────────────────────────
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
  'hm-1-desc': { en: 'Get 10% off any macaron set at Home Macaron', ru: 'Скидка 10% на любой набор макарунов в Home Macaron', kz: 'Home Macaron-да кез келген макарун жинағына 10% жеңілдік' },
  'hm-2-title': { en: 'Free Box of 6 Macarons', ru: 'Бесплатная коробка из 6 макарунов', kz: '6 макарун тегін қорабы' },
  'hm-2-desc': { en: 'Redeem for a free box of 6 assorted macarons', ru: 'Обменяйте на бесплатную коробку из 6 ассорти макарунов', kz: '6 ассорти макарун тегін қорабына айырбастаңыз' },
  // Shokoladnitsa
  'sh-1-title': { en: '15% Discount', ru: 'Скидка 15%', kz: '15% жеңілдік' },
  'sh-1-desc': { en: '15% off on any pastry or drink at Shokoladnitsa', ru: 'Скидка 15% на любую выпечку или напиток в Шоколаднице', kz: 'Шоколадницада кез келген тоқаш немесе сусынға 15% жеңілдік' },
  'sh-2-title': { en: 'Free Hot Chocolate', ru: 'Бесплатный горячий шоколад', kz: 'Тегін ыстық шоколад' },
  'sh-2-desc': { en: 'Enjoy a free hot chocolate of your choice', ru: 'Наслаждайтесь бесплатным горячим шоколадом на выбор', kz: 'Таңдауыңыз бойынша тегін ыстық шоколад алыңыз' },
  // Piece of Cake
  'pc-1-title': { en: 'Free Cake Slice', ru: 'Бесплатный кусок торта', kz: 'Тегін торт кесімі' },
  'pc-1-desc': { en: 'Redeem for a free slice of any cake', ru: 'Обменяйте на бесплатный кусок любого торта', kz: 'Кез келген торттың тегін кесіміне айырбастаңыз' },
  'pc-2-title': { en: '20% off Birthday Cakes', ru: 'Скидка 20% на торты ко дню рождения', kz: 'Туған күн торттарына 20% жеңілдік' },
  'pc-2-desc': { en: '20% discount on custom birthday cakes', ru: 'Скидка 20% на торты ко дню рождения на заказ', kz: 'Тапсырыс бойынша туған күн торттарына 20% жеңілдік' },
  // Coffee Mania
  'cm-1-title': { en: 'Free Espresso', ru: 'Бесплатный эспрессо', kz: 'Тегін эспрессо' },
  'cm-1-desc': { en: 'Get a free espresso or americano', ru: 'Получите бесплатный эспрессо или американо', kz: 'Тегін эспрессо немесе американо алыңыз' },
  'cm-2-title': { en: '2-for-1 Desserts', ru: '2 десерта по цене 1', kz: '1 бағасына 2 десерт' },
  'cm-2-desc': { en: 'Buy one dessert, get one free with your coffee', ru: 'Купите один десерт и получите второй бесплатно к кофе', kz: 'Бір десерт сатып алып, екіншісін кофемен тегін алыңыз' },
  // Bonapart
  'bp-1-title': { en: '25% off Croissants', ru: 'Скидка 25% на круассаны', kz: 'Круассандарға 25% жеңілдік' },
  'bp-1-desc': { en: '25% off any croissant variety at Bonapart', ru: 'Скидка 25% на любые круассаны в Бонапарт', kz: 'Бонапартта кез келген круассанға 25% жеңілдік' },
  'bp-2-title': { en: 'VIP Tasting Event', ru: 'VIP дегустация', kz: 'VIP дегустация' },
  'bp-2-desc': { en: 'Exclusive access to Bonapart VIP tasting event', ru: 'Эксклюзивный доступ к VIP дегустации Бонапарт', kz: 'Бонапарт VIP дегустациясына эксклюзивті қатынас' },
  // Platform-wide
  'pw-1-title': { en: '5% Cashback Boost', ru: 'Буст кэшбэка 5%', kz: '5% кэшбэк бусты' },
  'pw-1-desc': { en: 'Get 5% extra cashback on your next purchase at any partner', ru: 'Получите дополнительные 5% кэшбэка на следующую покупку у любого партнёра', kz: 'Кез келген серіктесте келесі сатып алуда қосымша 5% кэшбэк алыңыз' },
};

const rewards: Reward[] = [
  // Home Macaron
  { id: 'hm-1', partnerId: 'homemacaron', titleKey: 'hm-1-title', descKey: 'hm-1-desc', pointsRequired: 100, category: 'DISCOUNT', icon: TagIcon, available: 999 },
  { id: 'hm-2', partnerId: 'homemacaron', titleKey: 'hm-2-title', descKey: 'hm-2-desc', pointsRequired: 350, category: 'PRODUCT', icon: GiftIcon, available: 50 },
  // Shokoladnitsa
  { id: 'sh-1', partnerId: 'shokoladnitsa', titleKey: 'sh-1-title', descKey: 'sh-1-desc', pointsRequired: 150, category: 'DISCOUNT', icon: TagIcon, available: 500 },
  { id: 'sh-2', partnerId: 'shokoladnitsa', titleKey: 'sh-2-title', descKey: 'sh-2-desc', pointsRequired: 200, category: 'PRODUCT', icon: GiftIcon, available: 100 },
  // Piece of Cake
  { id: 'pc-1', partnerId: 'pieceofcake', titleKey: 'pc-1-title', descKey: 'pc-1-desc', pointsRequired: 250, category: 'PRODUCT', icon: GiftIcon, available: 80 },
  { id: 'pc-2', partnerId: 'pieceofcake', titleKey: 'pc-2-title', descKey: 'pc-2-desc', pointsRequired: 500, category: 'DISCOUNT', icon: TagIcon, available: 30 },
  // Coffee Mania
  { id: 'cm-1', partnerId: 'coffeemania', titleKey: 'cm-1-title', descKey: 'cm-1-desc', pointsRequired: 80, category: 'PRODUCT', icon: GiftIcon, available: 300 },
  { id: 'cm-2', partnerId: 'coffeemania', titleKey: 'cm-2-title', descKey: 'cm-2-desc', pointsRequired: 400, category: 'SPECIAL', icon: SparklesIcon, available: 50 },
  // Bonapart
  { id: 'bp-1', partnerId: 'bonapart', titleKey: 'bp-1-title', descKey: 'bp-1-desc', pointsRequired: 120, category: 'DISCOUNT', icon: TagIcon, available: 200 },
  { id: 'bp-2', partnerId: 'bonapart', titleKey: 'bp-2-title', descKey: 'bp-2-desc', pointsRequired: 1000, category: 'SPECIAL', icon: SparklesIcon, available: 10 },
  // Platform-wide
  { id: 'pw-1', partnerId: 'platform', titleKey: 'pw-1-title', descKey: 'pw-1-desc', pointsRequired: 500, category: 'CASHBACK', icon: SparklesIcon, available: 999 },
];

export default function CustomerRewards() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'en' | 'ru' | 'kz';

  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [coupon, setCoupon] = useState<{ code: string; reward: Reward; partner: Partner | null } | null>(null);

  const getRewardText = (key: string) => {
    return rewardsData[key]?.[lang] || rewardsData[key]?.en || key;
  };

  const filteredRewards = selectedPartner
    ? rewards.filter(r => r.partnerId === selectedPartner)
    : rewards;

  const getPartner = (id: string) => partners.find(p => p.id === id) || null;

  const handleRedeem = async (reward: Reward) => {
    setRedeeming(reward.id);
    await new Promise(r => setTimeout(r, 1500));
    const code = 'SWT-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    setCoupon({ code, reward, partner: getPartner(reward.partnerId) });
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
          // Showing single partner's rewards
          <RewardGroup
            partner={getPartner(selectedPartner)}
            rewards={filteredRewards}
            getRewardText={getRewardText}
            redeeming={redeeming}
            onRedeem={handleRedeem}
            t={t}
          />
        ) : (
          // Showing all partners grouped
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
            {/* Platform-wide */}
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

              {/* Coupon code */}
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
        <h2 className="text-sm font-bold text-zinc-300 tracking-tight">
          {isPlatform ? t('rewards.platformWide') : partner?.name}
        </h2>
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
