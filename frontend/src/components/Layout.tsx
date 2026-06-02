import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  HomeIcon,
  GiftIcon,
  UserCircleIcon,
  UserPlusIcon,
  QrCodeIcon,
  SparklesIcon,
  PresentationChartBarIcon,
  SunIcon,
  MoonIcon,
  BuildingStorefrontIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  GiftIcon as GiftIconSolid,
  UserCircleIcon as UserCircleIconSolid,
  UserPlusIcon as UserPlusIconSolid,
  QrCodeIcon as QrCodeIconSolid,
  SparklesIcon as SparklesIconSolid,
  PresentationChartBarIcon as PresentationChartBarIconSolid,
  BuildingStorefrontIcon as BuildingStorefrontIconSolid,
} from '@heroicons/react/24/solid';
import clsx from 'clsx';
import { changeLanguage, languages } from '../i18n';
import { useTheme } from '../hooks/useTheme';

interface LayoutProps {
  variant?: 'business' | 'customer';
}

export default function Layout({ variant = 'business' }: LayoutProps) {
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { isDark, toggle } = useTheme();

  const businessNavItems = [
    { path: '/business/dashboard', label: t('nav.pos'),       icon: HomeIcon,            activeIcon: HomeIconSolid },
    { path: '/business/verify-coupon', label: t('nav.verify'),     icon: QrCodeIcon,          activeIcon: QrCodeIconSolid },
    { path: '/ai',                 label: t('nav.ai'),          icon: SparklesIcon,        activeIcon: SparklesIconSolid },
    { path: '/referrals',          label: t('nav.referrals'),   icon: UserPlusIcon,        activeIcon: UserPlusIconSolid },
    { path: '/analytics',          label: t('nav.analytics'),   icon: PresentationChartBarIcon, activeIcon: PresentationChartBarIconSolid },
    { path: '/business/profile',   label: t('nav.profile'),   icon: UserCircleIcon,      activeIcon: UserCircleIconSolid },
  ];

  const customerNavItems = [
    { path: '/customer/dashboard',  label: t('nav.wallet'),         icon: HomeIcon,                  activeIcon: HomeIconSolid },
    { path: '/customer/rewards',    label: t('nav.rewards'),        icon: GiftIcon,                  activeIcon: GiftIconSolid },
    { path: '/customer/ecosystem',  label: t('nav.ecosystem'),      icon: BuildingStorefrontIcon,    activeIcon: BuildingStorefrontIconSolid },
    { path: '/customer/spin',       label: t('nav.spin') || 'Spin', icon: SparklesIcon,              activeIcon: SparklesIconSolid },
    { path: '/customer/profile',    label: t('nav.profile'),        icon: UserCircleIcon,            activeIcon: UserCircleIconSolid },
  ];

  const navItems = variant === 'customer' ? customerNavItems : businessNavItems;

  return (
    <div className="min-h-screen flex flex-col items-center transition-colors" style={{ background: 'var(--sweet-bg)' }}>
      {/* Top bar: theme toggle + language switcher */}
      <div className="w-full max-w-2xl px-4 pt-4 flex justify-between z-50">
        <button
          onClick={toggle}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
          style={{
            background: 'var(--sweet-accent-dim)',
            color: 'var(--sweet-accent)',
          }}
        >
          {isDark ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
        </button>

        <div className="flex items-center gap-0.5">
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => changeLanguage(l.code)}
              className={clsx(
                'w-8 h-8 rounded-full text-sm flex items-center justify-center transition-all',
                i18n.language === l.code
                  ? 'bg-amber-400/15 text-amber-400 ring-1 ring-amber-400/30'
                  : 'opacity-50 hover:opacity-80'
              )}
              style={{ color: i18n.language === l.code ? undefined : 'var(--sweet-text-muted)' }}
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
            background: `linear-gradient(to top, var(--sweet-bg) 60%, transparent)`,
            paddingBottom: '12px',
            paddingTop: '20px',
            paddingLeft: '16px',
            paddingRight: '16px',
          }}
        >
          <div className="flex justify-center mb-1">
            <span className="text-[8px] font-semibold tracking-widest uppercase" style={{ color: 'var(--sweet-text-faint)' }}>
              Powered by TON Blockchain
            </span>
          </div>
          <div
            className="backdrop-blur-xl rounded-2xl px-1 py-1 flex items-center justify-around shadow-lg transition-colors"
            style={{
              background: `color-mix(in srgb, var(--sweet-nav) 95%, transparent)`,
              border: `1px solid var(--sweet-border)`,
            }}
          >
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
                      className="absolute inset-0 rounded-xl"
                      style={{ background: 'var(--sweet-nav-active)' }}
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                    />
                  )}

                  <div
                    className="relative z-10 transition-all duration-200"
                    style={{ color: isActive ? 'var(--sweet-text)' : 'var(--sweet-text-muted)' }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <span
                    className="relative z-10 text-[9px] font-semibold mt-0.5 tracking-wide transition-all duration-200"
                    style={{ color: isActive ? 'var(--sweet-text)' : 'var(--sweet-text-muted)' }}
                  >
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
