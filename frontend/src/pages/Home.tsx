import { useNavigate } from 'react-router-dom';
import { useTonWallet } from '@tonconnect/ui-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { BuildingStorefrontIcon, UserIcon, SparklesIcon, ShieldCheckIcon, CubeTransparentIcon } from '@heroicons/react/24/outline';
import WalletConnect from '../components/WalletConnect';
import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { changeLanguage, languages } from '../i18n';
import toast from 'react-hot-toast';
import { api } from '../services/api';

// ─── Stagger container helpers ────────────────────────────────────────────────
const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

// ─── Subtle background ───────────────────────────────────────────────────────
function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {/* Single subtle top glow */}
      <div
        className="absolute rounded-full"
        style={{
          width: 400,
          height: 400,
          top: '-200px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
    </div>
  );
}

// ─── Value-prop card ──────────────────────────────────────────────────────────
interface ValueCardProps {
  icon: React.ReactNode;
  title: string;
  body: string;
}
function ValueCard({ icon, title, body }: ValueCardProps) {
  return (
    <motion.div
      variants={itemVariants}
      className="flex flex-col items-start gap-3 rounded-2xl p-4"
      style={{
        background: 'var(--sweet-card)',
        border: '1px solid var(--sweet-border)',
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          background: 'var(--sweet-accent-dim)',
          color: 'var(--sweet-accent)',
          border: '1px solid rgba(245,158,11,0.2)',
        }}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--sweet-text)' }}>
          {title}
        </p>
        <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--sweet-text-muted)' }}>
          {body}
        </p>
      </div>
    </motion.div>
  );
}

// ─── Role card ────────────────────────────────────────────────────────────────
interface RoleCardProps {
  icon: React.ReactNode;
  label: string;
  desc: string;
  accentColor: string;
  accentBg: string;
  onClick: () => void;
}
function RoleCard({ icon, label, desc, accentColor, accentBg, onClick }: RoleCardProps) {
  return (
    <motion.button
      variants={itemVariants}
      whileTap={{ scale: 0.97 }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="group w-full flex flex-col items-center gap-3 p-5 rounded-2xl text-center transition-shadow"
      style={{
        background: 'var(--sweet-card)',
        border: '1px solid var(--sweet-border)',
        boxShadow: '0 0 0 0 transparent',
        transition: 'box-shadow 0.25s, border-color 0.25s, transform 0.25s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = accentColor + '55';
        (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 4px 24px 0 ${accentColor}22`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--sweet-border)';
        (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 0 transparent';
      }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110"
        style={{ background: accentBg, color: accentColor, border: `1.5px solid ${accentColor}33` }}
      >
        <span className="w-7 h-7">{icon}</span>
      </div>
      <div>
        <p className="font-bold text-sm" style={{ color: 'var(--sweet-text)' }}>
          {label}
        </p>
        <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--sweet-text-muted)' }}>
          {desc}
        </p>
      </div>
      <div
        className="mt-auto text-xs font-semibold px-4 py-1.5 rounded-full transition-colors"
        style={{
          background: accentBg,
          color: accentColor,
          border: `1px solid ${accentColor}33`,
        }}
      >
        Select
      </div>
    </motion.button>
  );
}

// ─── Trust badge ──────────────────────────────────────────────────────────────
function TrustBadge({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-wide"
      style={{
        background: 'var(--sweet-card)',
        border: '1px solid var(--sweet-border)',
        color: 'var(--sweet-text-muted)',
      }}
    >
      {children}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate();
  const wallet = useTonWallet();
  const { role, setRole, setHasBusinessSbt, setToken, setUser } = useAuthStore();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    if (wallet && role === 'business') {
      navigate('/business/dashboard');
    } else if (wallet && role === 'customer') {
      navigate('/customer/dashboard');
    }
  }, [wallet, role, navigate]);

  const handleRoleSelect = async (selectedRole: 'business' | 'customer') => {
    const address = wallet?.account?.address;

    if (!address) {
      toast.error(t('home.walletNotConnected'));
      return;
    }

    if (selectedRole === 'customer') {
      // Auto-authenticate customer by wallet address — find-or-create
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res: any = await api.auth.customerAuth(address);
        if (res.data?.token) {
          setToken(res.data.token);
          setUser(res.data.partner);
        }
      } catch {
        // Non-fatal: navigation still proceeds
      }
      setRole('customer');
      navigate('/customer/dashboard');
      return;
    }

    // Business role: soft SBT check — warn but never block
    try {
      toast.loading(t('home.checkingCert') || 'Checking Partner Certificate...', { id: 'certCheck' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = await api.admin.checkSbt(address);
      if (res.data?.hasSbt) {
        setHasBusinessSbt(true);
        toast.success(t('home.certVerified') || 'Partner Certificate Verified!', { id: 'certCheck' });
      } else {
        toast(t('home.noCertFound') || 'No Partner SBT found — demo mode, continuing anyway.', { id: 'certCheck', icon: 'ℹ️' });
      }
    } catch {
      // SBT check failure is not a blocker
      toast.dismiss('certCheck');
    }

    setRole('business');

    // Check if already registered as a full business partner
    const existingToken = useAuthStore.getState().token;
    if (existingToken) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const meRes: any = await api.auth.me();
        const partner = meRes?.data?.partner;
        if (partner && !partner.companyName?.startsWith('Customer_')) {
          setUser(partner);
          navigate('/business/dashboard');
          return;
        }
      } catch {
        // Stale token — interceptor will clear it; fall through to register
      }
    }

    navigate('/business/register');
  };

  const valueCards = [
    {
      icon: <SparklesIcon className="w-5 h-5" />,
      title: t('home.step3Title'),
      body: 'Earn SWEET tokens with every purchase at partner confectioneries.',
    },
    {
      icon: <BuildingStorefrontIcon className="w-5 h-5" />,
      title: t('home.step2Title'),
      body: 'Redeem SWEET at any partner confectionery in the coalition network.',
    },
    {
      icon: <ShieldCheckIcon className="w-5 h-5" />,
      title: 'Verified on Blockchain',
      body: 'Every reward is transparent and verified on the TON blockchain.',
    },
  ];

  return (
    <>
      <div
        className="min-h-screen relative overflow-hidden flex flex-col"
        style={{ background: 'var(--sweet-bg)', color: 'var(--sweet-text)' }}
      >
        <AnimatedBackground />

        {/* ── Top bar ── */}
        <div className="relative z-20 flex items-center justify-between px-5 pt-5">
          {/* Testnet badge */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase"
            style={{
              background: 'rgba(59,130,246,0.08)',
              border: '1px solid rgba(59,130,246,0.2)',
              color: '#60a5fa',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            TON TESTNET
          </div>

          {/* Language switcher */}
          <div className="flex gap-1">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className="w-9 h-9 rounded-full text-sm font-bold transition-all flex items-center justify-center"
                style={
                  i18n.language === lang.code
                    ? {
                        background: 'var(--sweet-accent-dim)',
                        color: 'var(--sweet-accent)',
                        border: '1px solid rgba(245,158,11,0.3)',
                      }
                    : { color: 'var(--sweet-text-muted)' }
                }
              >
                {lang.flag}
              </button>
            ))}
          </div>
        </div>

        {/* ── Hero ── */}
        <div className="relative z-10 flex-1 flex flex-col items-center px-5 pt-10 pb-8 max-w-lg mx-auto w-full">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="w-full flex flex-col items-center gap-8"
          >
            {/* Logo + wordmark */}
            <motion.div variants={itemVariants} className="flex flex-col items-center gap-4 text-center">
              {/* Icon badge */}
              <div className="relative">
                <div
                  className="absolute inset-0 rounded-3xl"
                  style={{
                    background: 'radial-gradient(circle, rgba(245,158,11,0.35) 0%, transparent 70%)',
                    filter: 'blur(20px)',
                    transform: 'scale(1.4)',
                  }}
                />
                <div
                  className="relative w-20 h-20 rounded-3xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, var(--sweet-card-hover) 0%, var(--sweet-card) 100%)',
                    border: '1.5px solid rgba(245,158,11,0.25)',
                    boxShadow: '0 8px 32px rgba(245,158,11,0.12), inset 0 1px 0 rgba(255,255,255,0.05)',
                  }}
                >
                  <svg
                    className="w-10 h-10"
                    style={{ color: 'var(--sweet-accent)' }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.4}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
                    />
                  </svg>
                </div>
              </div>

              {/* Wordmark */}
              <div>
                <h1
                  className="text-[2.75rem] font-black tracking-tight leading-none"
                  style={{ letterSpacing: '-0.03em' }}
                >
                  <span style={{ color: 'var(--sweet-text)' }}>Sweet</span>
                  <span style={{ color: 'var(--sweet-accent)' }}> Loyalty</span>
                </h1>
                <p
                  className="mt-2 text-sm leading-relaxed"
                  style={{ color: 'var(--sweet-text-secondary)', maxWidth: '22rem' }}
                >
                  Blockchain-powered rewards for confectionery lovers
                </p>
              </div>

              {/* Trust badges row */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                <TrustBadge>
                  <CubeTransparentIcon className="w-3.5 h-3.5" style={{ color: 'var(--sweet-accent)' }} />
                  {t('home.poweredByTon')}
                </TrustBadge>
                <TrustBadge>
                  <ShieldCheckIcon className="w-3.5 h-3.5" style={{ color: '#34d399' }} />
                  Gasless transactions
                </TrustBadge>
                <TrustBadge>
                  <SparklesIcon className="w-3.5 h-3.5" style={{ color: 'var(--sweet-accent)' }} />
                  SWEET tokens
                </TrustBadge>
              </div>
            </motion.div>

            {/* ── Value cards (only before wallet connect) ── */}
            <AnimatePresence>
              {!wallet && (
                <motion.div
                  key="value-cards"
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  exit={{ opacity: 0, y: -10, transition: { duration: 0.25 } }}
                  className="grid grid-cols-1 gap-3 w-full"
                >
                  {valueCards.map((card) => (
                    <ValueCard key={card.title} {...card} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Wallet connect section ── */}
            <AnimatePresence mode="wait">
              {!wallet && (
                <motion.div
                  key="wallet-connect"
                  variants={itemVariants}
                  initial="hidden"
                  animate="show"
                  exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
                  className="w-full"
                >
                  <div
                    className="rounded-2xl p-6 text-center relative overflow-hidden"
                    style={{
                      background: 'var(--sweet-card)',
                      border: '1px solid var(--sweet-border)',
                      boxShadow: '0 4px 32px rgba(245,158,11,0.06)',
                    }}
                  >
                    {/* Subtle inner glow */}
                    <div
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px"
                      style={{
                        background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.4), transparent)',
                      }}
                    />

                    <div className="mb-1">
                      <p
                        className="text-base font-bold"
                        style={{ color: 'var(--sweet-text)' }}
                      >
                        Get started in seconds
                      </p>
                      <p
                        className="text-sm mt-1 leading-relaxed"
                        style={{ color: 'var(--sweet-text-secondary)' }}
                      >
                        {t('home.connectWallet')}
                      </p>
                    </div>

                    <div className="flex justify-center mt-4">
                      <WalletConnect />
                    </div>

                    <p
                      className="text-[11px] mt-4"
                      style={{ color: 'var(--sweet-text-faint)' }}
                    >
                      Non-custodial · Your keys, your tokens
                    </p>
                  </div>
                </motion.div>
              )}

              {/* ── Role selection ── */}
              {wallet && !role && (
                <motion.div
                  key="role-select"
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full"
                >
                  {/* Connected pill */}
                  <div className="flex justify-center mb-5">
                    <div
                      className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold"
                      style={{
                        background: 'rgba(52,211,153,0.08)',
                        border: '1px solid rgba(52,211,153,0.2)',
                        color: '#34d399',
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Wallet connected
                    </div>
                  </div>

                  <p
                    className="text-center text-xs tracking-widest uppercase mb-4"
                    style={{ color: 'var(--sweet-text-muted)' }}
                  >
                    {t('home.chooseRole')}
                  </p>

                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-2 gap-3"
                  >
                    <RoleCard
                      icon={<UserIcon className="w-7 h-7" />}
                      label={t('home.customer')}
                      desc={t('home.customerDesc')}
                      accentColor="#f59e0b"
                      accentBg="rgba(245,158,11,0.1)"
                      onClick={() => handleRoleSelect('customer')}
                    />
                    <RoleCard
                      icon={<BuildingStorefrontIcon className="w-7 h-7" />}
                      label={t('home.business')}
                      desc={t('home.businessDesc')}
                      accentColor="#fb923c"
                      accentBg="rgba(251,146,60,0.1)"
                      onClick={() => handleRoleSelect('business')}
                    />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── How it works steps (pre-wallet) ── */}
            <AnimatePresence>
              {!wallet && (
                <motion.div
                  key="how-it-works"
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  exit={{ opacity: 0, transition: { duration: 0.2 } }}
                  className="w-full"
                >
                  <p
                    className="text-center text-[10px] font-semibold tracking-widest uppercase mb-3"
                    style={{ color: 'var(--sweet-text-faint)' }}
                  >
                    {t('home.howItWorks')}
                  </p>

                  <div className="relative">
                    {/* Vertical connector line */}
                    <div
                      className="absolute left-[22px] top-5 bottom-5 w-px"
                      style={{ background: 'var(--sweet-border)' }}
                    />

                    <div className="space-y-2">
                      {[
                        { step: '1', title: t('home.step1Title'), desc: t('home.step1Desc') },
                        { step: '2', title: t('home.step2Title'), desc: t('home.step2Desc') },
                        { step: '3', title: t('home.step3Title'), desc: t('home.step3Desc') },
                      ].map(({ step, title, desc }) => (
                        <motion.div
                          key={step}
                          variants={itemVariants}
                          className="flex items-start gap-4 p-4 rounded-2xl"
                          style={{
                            background: 'var(--sweet-card)',
                            border: '1px solid var(--sweet-border)',
                          }}
                        >
                          <div
                            className="relative z-10 w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0"
                            style={{
                              background: 'var(--sweet-accent-dim)',
                              color: 'var(--sweet-accent)',
                              border: '1px solid rgba(245,158,11,0.25)',
                            }}
                          >
                            {step}
                          </div>
                          <div className="pt-0.5">
                            <p
                              className="text-sm font-semibold leading-tight"
                              style={{ color: 'var(--sweet-text)' }}
                            >
                              {title}
                            </p>
                            <p
                              className="text-xs mt-0.5 leading-relaxed"
                              style={{ color: 'var(--sweet-text-faint)' }}
                            >
                              {desc}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* ── Footer ── */}
        <div className="relative z-10 pb-6 pt-2 flex flex-col items-center gap-2">
          <div
            className="flex items-center gap-3 text-[10px] font-medium tracking-wide"
            style={{ color: 'var(--sweet-text-faint)' }}
          >
            <span>SWEET</span>
            <span
              className="w-1 h-1 rounded-full"
              style={{ background: 'var(--sweet-text-faint)' }}
            />
            <span>{t('home.footer')}</span>
          </div>
        </div>
      </div>
    </>
  );
}
