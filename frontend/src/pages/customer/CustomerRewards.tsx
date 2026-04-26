import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  TagIcon,
  GiftIcon,
  SparklesIcon,
  TicketIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../store/authStore';
import { useTonWallet } from '@tonconnect/ui-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';

interface Partner {
  id: string;
  name: string;
  logo: string | null;
  color: string;
  emoji: string;
  city: string;
}

const partners: Partner[] = [
  { id: 'homemacaron',   name: 'Home Macaron',  logo: '/confectionary_logos/home_macaron.jpg', color: 'from-pink-500/20 to-rose-900/10',    emoji: '🎀', city: 'Алматы' },
  { id: 'qulpynai',      name: 'Qulpynai',      logo: null, color: 'from-amber-500/20 to-amber-900/10',   emoji: '🍓', city: 'Алматы · 25 филиалов' },
  { id: 'panaderia',     name: 'Panaderia',     logo: null, color: 'from-orange-500/20 to-orange-900/10', emoji: '🥐', city: 'Алматы' },
  { id: 'marrone_rosso', name: 'Marrone Rosso', logo: null, color: 'from-red-500/20 to-red-900/10',       emoji: '☕', city: 'Алматы · Астана' },
  { id: 'taptatti',      name: 'TapTatti',      logo: null, color: 'from-violet-500/20 to-violet-900/10', emoji: '🎂', city: 'Астана · Доставка по КЗ' },
];

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
  'hm-1-title': { en: '10% Discount on Macarons', ru: 'Скидка 10% на макаруны', kz: 'Макарундарға 10% жеңілдік' },
  'hm-1-desc':  { en: 'Get 10% off any macaron set at Home Macaron', ru: 'Скидка 10% на любой набор макарунов', kz: 'Кез келген макарун жинағына 10% жеңілдік' },
  'hm-2-title': { en: 'Free Box of 6 Macarons', ru: 'Бесплатная коробка из 6 макарунов', kz: '6 макарун тегін қорабы' },
  'hm-2-desc':  { en: 'Redeem for a free box of 6 assorted macarons', ru: 'Обменяйте на бесплатную коробку из 6 ассорти', kz: '6 ассорти макарун тегін қорабына айырбастаңыз' },
  'ql-1-title': { en: '15% Discount on Pastries', ru: 'Скидка 15% на выпечку', kz: 'Пісірілген тағамдарға 15% жеңілдік' },
  'ql-1-desc':  { en: '15% off any pastry at any Qulpynai location', ru: 'Скидка 15% на выпечку в любом филиале Qulpynai', kz: 'Qulpynai кез келген филиалында тоқашқа 15% жеңілдік' },
  'ql-2-title': { en: 'Free Samsa', ru: 'Бесплатная самса', kz: 'Тегін самса' },
  'ql-2-desc':  { en: 'Get a free samsa with any drink purchase', ru: 'Бесплатная самса при покупке напитка', kz: 'Сусын сатып алғанда тегін самса' },
  'pn-1-title': { en: 'Free Croissant', ru: 'Бесплатный круассан', kz: 'Тегін круассан' },
  'pn-1-desc':  { en: 'A fresh Spanish-style croissant on the house', ru: 'Свежий круассан в испанском стиле в подарок', kz: 'Испандық стильдегі жаңа круассан сыйлық' },
  'pn-2-title': { en: '20% off Artisan Bread', ru: 'Скидка 20% на ремесленный хлеб', kz: 'Қолөнер нанына 20% жеңілдік' },
  'pn-2-desc':  { en: '20% off any artisan sourdough bread', ru: 'Скидка 20% на любой ремесленный хлеб', kz: 'Ашытқыдағы кез келген нанға 20% жеңілдік' },
  'mr-1-title': { en: 'Free Espresso', ru: 'Бесплатный эспрессо', kz: 'Тегін эспрессо' },
  'mr-1-desc':  { en: 'Enjoy a free espresso or americano at Marrone Rosso', ru: 'Бесплатный эспрессо или американо', kz: 'Тегін эспрессо немесе американо' },
  'mr-2-title': { en: '2-for-1 Cakes', ru: '2 торта по цене 1', kz: '1 бағасына 2 торт' },
  'mr-2-desc':  { en: 'Buy one cake slice, get one free', ru: 'Купите один кусок — второй бесплатно', kz: 'Бір кесім сатып алып, екіншісін тегін алыңыз' },
  'tt-1-title': { en: '25% off Custom Cakes', ru: 'Скидка 25% на торты на заказ', kz: 'Тапсырыс торттарына 25% жеңілдік' },
  'tt-1-desc':  { en: '25% off any custom-order cake with delivery', ru: 'Скидка 25% на торт на заказ с доставкой', kz: 'Жеткізумен тапсырыс тортына 25% жеңілдік' },
  'tt-2-title': { en: 'Free Delivery', ru: 'Бесплатная доставка', kz: 'Тегін жеткізу' },
  'tt-2-desc':  { en: 'Free delivery anywhere in Kazakhstan', ru: 'Бесплатная доставка по всему Казахстану', kz: 'Бүкіл Қазақстан бойынша тегін жеткізу' },
  'pw-1-title': { en: '5% Cashback Boost', ru: 'Буст кэшбэка +5%', kz: '+5% кэшбэк бусты' },
  'pw-1-desc':  { en: 'Get 5% extra cashback on your next purchase', ru: 'Дополнительные 5% кэшбэка на следующую покупку', kz: 'Келесі сатып алуда қосымша 5% кэшбэк' },
};

const rewards: Reward[] = [
  { id: 'hm-1', partnerId: 'homemacaron',   titleKey: 'hm-1-title', descKey: 'hm-1-desc', pointsRequired: 100,  category: 'DISCOUNT', icon: TagIcon,       available: 999 },
  { id: 'hm-2', partnerId: 'homemacaron',   titleKey: 'hm-2-title', descKey: 'hm-2-desc', pointsRequired: 350,  category: 'PRODUCT',  icon: GiftIcon,      available: 50 },
  { id: 'ql-1', partnerId: 'qulpynai',      titleKey: 'ql-1-title', descKey: 'ql-1-desc', pointsRequired: 150,  category: 'DISCOUNT', icon: TagIcon,       available: 500 },
  { id: 'ql-2', partnerId: 'qulpynai',      titleKey: 'ql-2-title', descKey: 'ql-2-desc', pointsRequired: 200,  category: 'PRODUCT',  icon: GiftIcon,      available: 100 },
  { id: 'pn-1', partnerId: 'panaderia',     titleKey: 'pn-1-title', descKey: 'pn-1-desc', pointsRequired: 180,  category: 'PRODUCT',  icon: GiftIcon,      available: 200 },
  { id: 'pn-2', partnerId: 'panaderia',     titleKey: 'pn-2-title', descKey: 'pn-2-desc', pointsRequired: 300,  category: 'DISCOUNT', icon: TagIcon,       available: 80 },
  { id: 'mr-1', partnerId: 'marrone_rosso', titleKey: 'mr-1-title', descKey: 'mr-1-desc', pointsRequired: 80,   category: 'PRODUCT',  icon: GiftIcon,      available: 300 },
  { id: 'mr-2', partnerId: 'marrone_rosso', titleKey: 'mr-2-title', descKey: 'mr-2-desc', pointsRequired: 400,  category: 'SPECIAL',  icon: SparklesIcon,  available: 50 },
  { id: 'tt-1', partnerId: 'taptatti',      titleKey: 'tt-1-title', descKey: 'tt-1-desc', pointsRequired: 500,  category: 'DISCOUNT', icon: TagIcon,       available: 100 },
  { id: 'tt-2', partnerId: 'taptatti',      titleKey: 'tt-2-title', descKey: 'tt-2-desc', pointsRequired: 250,  category: 'SPECIAL',  icon: SparklesIcon,  available: 300 },
  { id: 'pw-1', partnerId: 'platform',      titleKey: 'pw-1-title', descKey: 'pw-1-desc', pointsRequired: 500,  category: 'CASHBACK', icon: SparklesIcon,  available: 999 },
];

const CATEGORY_COLOR: Record<string, string> = {
  DISCOUNT: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  PRODUCT:  'bg-green-500/10 text-green-400 border-green-500/20',
  CASHBACK: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  SPECIAL:  'bg-violet-500/10 text-violet-400 border-violet-500/20',
};

export default function CustomerRewards() {
  const navigate = useNavigate();
  const wallet = useTonWallet();
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'en' | 'ru' | 'kz';
  const { addCoupon, sweetBalance, setSweetBalance } = useAuthStore();

  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [coupon, setCoupon] = useState<{
    code: string;
    reward: Reward;
    partner: Partner | null;
    expiresAt: string;
    daysLeft: number;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (!wallet) return;
    fetch(`https://testnet.tonapi.io/v2/accounts/${wallet.account.address}/jettons`)
      .then(r => r.json())
      .then(data => {
        const sweet = data.balances?.find((b: { jetton: { address: string; decimals: number }; balance: string }) =>
          b.jetton?.address?.toLowerCase() === '0:4d3a2278693a04f846b5d83a58e67066bb56ca4f46b1b7cd49992f4114f87c9c'
        );
        if (sweet) setSweetBalance(Number(BigInt(sweet.balance) / BigInt(10 ** sweet.jetton.decimals)));
      })
      .catch(() => {});
  }, [wallet]);

  const getText = (key: string) => rewardsData[key]?.[lang] || rewardsData[key]?.en || key;
  const getPartner = (id: string) => partners.find(p => p.id === id) || null;

  const filteredRewards = selectedPartner
    ? rewards.filter(r => r.partnerId === selectedPartner)
    : rewards;

  const handleRedeem = async (reward: Reward) => {
    if (sweetBalance < reward.pointsRequired) {
      toast.error(t('rewards.insufficientBalance') || 'Insufficient SWEET balance');
      return;
    }
    setRedeeming(reward.id);
    try {
      const res = await api.coupons.create(reward.id) as { data: { code: string; expiresAt: string; daysLeft: number } };
      const { code, expiresAt, daysLeft } = res.data;
      const partner = getPartner(reward.partnerId);
      setSweetBalance(Math.max(0, sweetBalance - reward.pointsRequired));
      addCoupon({ code, rewardTitleKey: reward.titleKey, partnerName: partner?.name || 'Platform' });
      setCoupon({ code, reward, partner, expiresAt, daysLeft });
      toast.success('Coupon issued!');
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message || 'Failed to issue coupon');
    }
    setRedeeming(null);
  };

  const allPartnerItems = [...partners, { id: 'platform', name: '⚡ Platform', logo: null, color: '', emoji: '⚡', city: '' }];

  return (
    <div className="pb-28 text-white">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
        <button
          onClick={() => navigate('/customer/dashboard')}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-4"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight">{t('rewards.title')}</h1>
            <p className="text-zinc-500 text-xs mt-0.5">{t('rewards.subtitle')}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-black text-amber-400">{sweetBalance.toLocaleString()}</p>
            <p className="text-[10px] text-zinc-600">SWEET available</p>
          </div>
        </div>
      </motion.div>

      {/* Partner filter */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.05 }}
        className="flex gap-2 overflow-x-auto no-scrollbar mb-5 -mx-4 px-4 pb-1"
      >
        <FilterChip active={!selectedPartner} onClick={() => setSelectedPartner(null)} label="All" />
        {partners.map(p => (
          <FilterChip
            key={p.id}
            active={selectedPartner === p.id}
            onClick={() => setSelectedPartner(p.id)}
            label={p.name}
            logo={p.logo}
            emoji={p.emoji}
          />
        ))}
      </motion.div>

      {/* Reward groups */}
      <div className="space-y-5">
        {selectedPartner ? (
          <RewardGroup
            partner={getPartner(selectedPartner)}
            rewards={filteredRewards}
            getText={getText}
            redeeming={redeeming}
            onRedeem={handleRedeem}
            balance={sweetBalance}
            t={t}
          />
        ) : (
          <>
            {allPartnerItems.map(p => {
              const gr = rewards.filter(r => r.partnerId === p.id);
              if (!gr.length) return null;
              return (
                <RewardGroup
                  key={p.id}
                  partner={p.id === 'platform' ? null : getPartner(p.id)}
                  isPlatform={p.id === 'platform'}
                  rewards={gr}
                  getText={getText}
                  redeeming={redeeming}
                  onRedeem={handleRedeem}
                  balance={sweetBalance}
                  t={t}
                />
              );
            })}
          </>
        )}
      </div>

      {/* Coupon modal */}
      <AnimatePresence>
        {coupon && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end justify-center p-4"
            onClick={() => setCoupon(null)}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl border border-white/10 bg-zinc-950 p-5"
            >
              <div className="flex justify-center mb-4">
                <div className="w-10 h-1 rounded-full bg-white/10" />
              </div>

              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-3">
                  <TicketIcon className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-lg font-black text-white">Your Coupon</h3>
                <p className="text-xs text-zinc-500 mt-0.5">{coupon.partner?.name || 'Platform-wide'}</p>
              </div>

              {/* Code */}
              <div className="relative rounded-2xl border border-dashed border-amber-400/25 bg-amber-400/[0.04] py-4 px-5 mb-4">
                <p className="text-3xl font-black font-mono tracking-[0.18em] text-amber-400 text-center">
                  {coupon.code}
                </p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(coupon.code);
                    setCopiedCode(true);
                    toast.success('Copied!', { duration: 1200 });
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {copiedCode
                    ? <CheckIcon className="w-4 h-4 text-green-400" />
                    : <ClipboardDocumentIcon className="w-4 h-4 text-zinc-500" />
                  }
                </button>
                <div className="absolute top-1/2 -left-3 w-6 h-6 rounded-full bg-zinc-950 -translate-y-1/2" />
                <div className="absolute top-1/2 -right-3 w-6 h-6 rounded-full bg-zinc-950 -translate-y-1/2" />
              </div>

              {/* Details */}
              <div className="space-y-2 mb-5 bg-white/[0.02] rounded-2xl p-4">
                {[
                  { label: 'Reward', value: getText(coupon.reward.titleKey) },
                  { label: 'Points spent', value: `-${coupon.reward.pointsRequired.toLocaleString()} SWEET` },
                  { label: 'Valid for', value: `${coupon.daysLeft} days`, highlight: coupon.daysLeft <= 5 },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500 flex items-center gap-1">
                      {row.label === 'Valid for' && <ClockIcon className="w-3 h-3" />}
                      {row.label}
                    </span>
                    <span className={row.highlight ? 'text-red-400 font-semibold' : 'text-white font-medium'}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-[10px] text-zinc-600 text-center mb-4">
                Show to cashier at {coupon.partner?.name || 'any partner'}
              </p>

              <button
                onClick={() => setCoupon(null)}
                className="w-full py-3 bg-white text-black font-bold rounded-2xl hover:bg-zinc-200 transition-colors text-sm"
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

function FilterChip({ active, onClick, label, logo, emoji }: {
  active: boolean;
  onClick: () => void;
  label: string;
  logo?: string | null;
  emoji?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
        active
          ? 'bg-white text-black border-white'
          : 'bg-zinc-900/60 text-zinc-400 border-white/8 hover:border-white/20'
      }`}
    >
      {logo
        ? <img src={logo} alt={label} className="w-4 h-4 rounded object-cover" />
        : emoji && <span className="text-[13px]">{emoji}</span>
      }
      {label}
    </button>
  );
}

function RewardGroup({
  partner,
  rewards,
  getText,
  redeeming,
  onRedeem,
  balance,
  t,
  isPlatform,
}: {
  partner: Partner | null;
  rewards: Reward[];
  getText: (key: string) => string;
  redeeming: string | null;
  onRedeem: (r: Reward) => void;
  balance: number;
  t: (key: string) => string;
  isPlatform?: boolean;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      {/* Partner header */}
      <div className="flex items-center gap-2.5 mb-2.5">
        {partner?.logo ? (
          <img src={partner.logo} alt={partner.name} className="w-7 h-7 rounded-lg object-cover" />
        ) : (
          <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${partner?.color || 'from-zinc-700/40 to-zinc-900/20'} flex items-center justify-center text-sm border border-white/5`}>
            {isPlatform ? '⚡' : partner?.emoji || partner?.name?.charAt(0)}
          </div>
        )}
        <div>
          <p className="text-sm font-bold text-zinc-200">{isPlatform ? t('rewards.platformWide') : partner?.name}</p>
          {partner?.city && <p className="text-[10px] text-zinc-600">{partner.city}</p>}
        </div>
      </div>

      <div className="space-y-2">
        {rewards.map(reward => {
          const canAfford = balance >= reward.pointsRequired;
          return (
            <div
              key={reward.id}
              className={`rounded-2xl border p-4 transition-all ${
                canAfford
                  ? 'bg-white/[0.02] border-white/8 hover:border-white/15'
                  : 'bg-zinc-900/30 border-white/5 opacity-60'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${partner?.color || 'from-zinc-700/40 to-zinc-900/20'} flex items-center justify-center flex-shrink-0 border border-white/5`}>
                  <reward.icon className="w-4 h-4 text-zinc-300" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <p className="text-sm font-bold text-white leading-tight">{getText(reward.titleKey)}</p>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-semibold shrink-0 ${CATEGORY_COLOR[reward.category]}`}>
                      {reward.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-snug mb-2.5">{getText(reward.descKey)}</p>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-400">
                      {reward.pointsRequired.toLocaleString()} <span className="text-[10px] font-semibold text-zinc-600">SWEET</span>
                    </span>
                    <button
                      onClick={() => onRedeem(reward)}
                      disabled={!canAfford || redeeming === reward.id}
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        canAfford
                          ? 'bg-white text-black hover:bg-zinc-200 active:scale-95'
                          : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                      }`}
                    >
                      {redeeming === reward.id
                        ? <span className="inline-block w-3 h-3 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                        : t('rewards.redeem')
                      }
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
