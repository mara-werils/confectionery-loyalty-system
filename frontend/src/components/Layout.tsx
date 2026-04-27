import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  HomeIcon,
  GiftIcon,
  UserCircleIcon,
  CubeTransparentIcon,
  UserPlusIcon,
  ChartBarIcon,
  QrCodeIcon,
  SparklesIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  GiftIcon as GiftIconSolid,
  UserCircleIcon as UserCircleIconSolid,
  CubeTransparentIcon as CubeTransparentIconSolid,
  UserPlusIcon as UserPlusIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  QrCodeIcon as QrCodeIconSolid,
  SparklesIcon as SparklesIconSolid,
  TrophyIcon as TrophyIconSolid,
} from '@heroicons/react/24/solid';
import clsx from 'clsx';
import { changeLanguage, languages } from '../i18n';

interface LayoutProps {
  variant?: 'business' | 'customer';
}

export default function Layout({ variant = 'business' }: LayoutProps) {
  const location = useLocation();
  const { t, i18n } = useTranslation();

  const businessNavItems = [
    { path: '/business/dashboard', label: t('nav.pos'),       icon: HomeIcon,            activeIcon: HomeIconSolid },
    { path: '/business/verify-coupon', label: 'Verify',       icon: QrCodeIcon,          activeIcon: QrCodeIconSolid },
    { path: '/ai',                 label: 'AI',               icon: SparklesIcon,        activeIcon: SparklesIconSolid },
    { path: '/blockchain',         label: t('nav.blockchain'), icon: CubeTransparentIcon, activeIcon: CubeTransparentIconSolid },
    { path: '/referrals',          label: 'Refs',             icon: UserPlusIcon,        activeIcon: UserPlusIconSolid },
    { path: '/business/profile',   label: t('nav.profile'),   icon: UserCircleIcon,      activeIcon: UserCircleIconSolid },
  ];

  const customerNavItems = [
    { path: '/customer/dashboard', label: t('nav.wallet'),  icon: HomeIcon,     activeIcon: HomeIconSolid },
    { path: '/customer/rewards',   label: t('nav.rewards'), icon: GiftIcon,     activeIcon: GiftIconSolid },
    { path: '/achievements',       label: 'NFTs',           icon: TrophyIcon,   activeIcon: TrophyIconSolid },
    { path: '/stats',              label: 'Stats',          icon: ChartBarIcon, activeIcon: ChartBarIconSolid },
    { path: '/customer/profile',   label: t('nav.profile'), icon: UserCircleIcon, activeIcon: UserCircleIconSolid },
  ];

  const navItems = variant === 'customer' ? customerNavItems : businessNavItems;

  return (
    <div className="min-h-screen flex flex-col items-center bg-[#0d0b0a]">
      {/* Language switcher — top right */}
      <div className="w-full max-w-2xl px-4 pt-4 flex justify-end z-50">
        <div className="flex items-center gap-0.5">
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => changeLanguage(l.code)}
              className={clsx(
                'w-8 h-8 rounded-full text-sm flex items-center justify-center transition-all',
                i18n.language === l.code
                  ? 'bg-amber-400/15 text-amber-400 ring-1 ring-amber-400/30'
                  : 'text-stone-600 hover:text-stone-400'
              )}
              title={l.name}
            >
              <span>{l.flag}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Page content */}
      <main className="flex-1 w-full max-w-2xl pb-24 overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="h-full px-4 pt-5"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-safe">
        <div
          className="w-full max-w-2xl mx-auto"
          style={{
            background: 'linear-gradient(to top, #0d0b0a 60%, transparent)',
            paddingBottom: '12px',
            paddingTop: '20px',
            paddingLeft: '16px',
            paddingRight: '16px',
          }}
        >
          <div className="bg-stone-900/90 backdrop-blur-2xl border border-white/8 rounded-2xl px-1 py-1 flex items-center justify-around shadow-[0_-4px_24px_rgba(0,0,0,0.4)]">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = isActive ? item.activeIcon : item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className="relative flex flex-col items-center justify-center flex-1 py-2.5 rounded-xl transition-colors duration-200 group"
                >
                  {isActive && (
                    <motion.div
                      layoutId="navPill"
                      className="absolute inset-0 rounded-xl bg-white/8"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                    />
                  )}

                  <div className={clsx(
                    'relative z-10 transition-all duration-200',
                    isActive ? 'text-white' : 'text-stone-600 group-hover:text-stone-400'
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <span className={clsx(
                    'relative z-10 text-[9px] font-semibold mt-0.5 tracking-wide transition-all duration-200',
                    isActive ? 'text-white' : 'text-stone-600'
                  )}>
                    {item.label}
                  </span>
                </NavLink>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
