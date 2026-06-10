import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  HouseIcon,
  GiftIcon,
  UserCircleIcon,
  QrCodeIcon,
  BrainIcon,
  SunIcon,
  MoonIcon,
  StorefrontIcon,
  PaperPlaneTiltIcon,
  MoneyIcon,
  TicketIcon,
  CoinsIcon,
} from '@phosphor-icons/react';
import clsx from 'clsx';
import { changeLanguage, languages } from '../i18n';
import { useTheme } from '../hooks/useTheme';
import GlobalCelebration from './GlobalCelebration';

interface LayoutProps {
  variant?: 'business' | 'customer';
}

export default function Layout({ variant = 'business' }: LayoutProps) {
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { isDark, toggle } = useTheme();

  const businessNavItems = [
    { path: '/business/dashboard',    label: t('nav.pos'),       icon: HouseIcon,       activeIcon: (props: React.ComponentProps<typeof HouseIcon>) => <HouseIcon weight="fill" {...props} /> },
    { path: '/business/verify-coupon',label: t('nav.verify'),    icon: QrCodeIcon,      activeIcon: (props: React.ComponentProps<typeof QrCodeIcon>) => <QrCodeIcon weight="fill" {...props} /> },
    { path: '/business/sweetpass',    label: t('nav.sweetpass') || 'Pre-orders', icon: TicketIcon, activeIcon: (props: React.ComponentProps<typeof TicketIcon>) => <TicketIcon weight="fill" {...props} /> },
    { path: '/ai',                    label: t('nav.ai'),        icon: BrainIcon,       activeIcon: (props: React.ComponentProps<typeof BrainIcon>) => <BrainIcon weight="fill" {...props} /> },
    { path: '/business/settlement',   label: 'Earn',             icon: MoneyIcon,       activeIcon: (props: React.ComponentProps<typeof MoneyIcon>) => <MoneyIcon weight="fill" {...props} /> },
    { path: '/business/profile',      label: t('nav.profile'),   icon: UserCircleIcon,  activeIcon: (props: React.ComponentProps<typeof UserCircleIcon>) => <UserCircleIcon weight="fill" {...props} /> },
  ];

  const customerNavItems = [
    { path: '/customer/dashboard',  label: t('nav.wallet'),         icon: HouseIcon,        activeIcon: (props: React.ComponentProps<typeof HouseIcon>) => <HouseIcon weight="fill" {...props} /> },
    { path: '/customer/rewards',    label: t('nav.rewards'),        icon: GiftIcon,         activeIcon: (props: React.ComponentProps<typeof GiftIcon>) => <GiftIcon weight="fill" {...props} /> },
    { path: '/customer/sweetpass',  label: t('nav.sweetpass') || 'Pre-order', icon: TicketIcon, activeIcon: (props: React.ComponentProps<typeof TicketIcon>) => <TicketIcon weight="fill" {...props} /> },
    { path: '/customer/gift',       label: t('nav.gift') || 'Transfer', icon: PaperPlaneTiltIcon, activeIcon: (props: React.ComponentProps<typeof PaperPlaneTiltIcon>) => <PaperPlaneTiltIcon weight="fill" {...props} /> },
    { path: '/customer/ecosystem',  label: t('nav.ecosystem'),      icon: StorefrontIcon,   activeIcon: (props: React.ComponentProps<typeof StorefrontIcon>) => <StorefrontIcon weight="fill" {...props} /> },
    { path: '/customer/profile',    label: t('nav.profile'),        icon: UserCircleIcon,   activeIcon: (props: React.ComponentProps<typeof UserCircleIcon>) => <UserCircleIcon weight="fill" {...props} /> },
  ];

  const navItems = variant === 'customer' ? customerNavItems : businessNavItems;

  return (
    <div
      className="min-h-screen flex flex-col items-center transition-colors"
      style={{ background: 'var(--sweet-bg)' }}
    >
      {/* App-wide cashback celebration (customer only) */}
      {variant === 'customer' && <GlobalCelebration />}

      {/* Top bar: theme toggle + language switcher */}
      <div className="w-full max-w-2xl px-4 pt-4 flex justify-between z-50">
        <div className="flex items-center gap-1.5">
        <button
          onClick={toggle}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
          style={{
            background: 'var(--sweet-accent-dim)',
            color: 'var(--sweet-accent)',
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={isDark ? 'sun' : 'moon'}
              initial={{ opacity: 0, rotate: -30, scale: 0.7 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 30, scale: 0.7 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center"
            >
              {isDark ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
            </motion.span>
          </AnimatePresence>
        </button>

        {variant === 'customer' && (
          <NavLink
            to="/customer/tokenomics"
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
            style={({ isActive }) => ({
              background: 'var(--sweet-accent-dim)',
              color: 'var(--sweet-accent)',
              boxShadow: isActive ? '0 0 0 1px var(--sweet-accent)' : 'none',
            })}
            title={t('tokenomics.title') || 'How SWEET works'}
          >
            <CoinsIcon className="w-4 h-4" />
          </NavLink>
        )}
        </div>

        <div className="flex items-center gap-0.5">
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => changeLanguage(l.code)}
              className={clsx(
                'w-8 h-8 rounded-full text-sm flex items-center justify-center transition-all duration-200',
                i18n.language === l.code
                  ? 'ring-1'
                  : 'opacity-50 hover:opacity-80'
              )}
              style={
                i18n.language === l.code
                  ? {
                      background: 'var(--sweet-accent-dim)',
                      color: 'var(--sweet-accent)',
                      boxShadow: '0 0 0 1px var(--sweet-accent)',
                    }
                  : { color: 'var(--sweet-text-muted)' }
              }
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
            initial={{ opacity: 0, y: 14 }}
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
            <span
              className="text-[8px] font-semibold tracking-widest uppercase"
              style={{ color: 'var(--sweet-text-faint)' }}
            >
              Powered by TON Blockchain
            </span>
          </div>

          {/* Glass nav bar */}
          <div
            className="backdrop-blur-xl rounded-2xl px-1 py-1 flex items-center justify-around shadow-lg transition-colors"
            style={{
              background: 'var(--sweet-nav)',
              border: '1px solid var(--sweet-border)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 1px 0 var(--sweet-border-light) inset',
            }}
          >
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = isActive ? item.activeIcon : item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className="relative flex flex-col items-center justify-center flex-1 py-2.5 rounded-xl transition-colors duration-200 group focus:outline-none"
                >
                  {/* Active background pill */}
                  {isActive && (
                    <motion.div
                      layoutId="navPill"
                      className="absolute inset-0 rounded-xl"
                      style={{ background: 'var(--sweet-nav-active)' }}
                      transition={{ type: 'spring', bounce: 0.18, duration: 0.45 }}
                    />
                  )}

                  {/* Icon */}
                  <motion.div
                    className="relative z-10 transition-all duration-200"
                    style={{ color: isActive ? 'var(--sweet-accent)' : 'var(--sweet-text-muted)' }}
                    animate={{ scale: isActive ? 1.1 : 1 }}
                    transition={{ type: 'spring', bounce: 0.35, duration: 0.3 }}
                  >
                    <Icon className="w-5 h-5" />
                  </motion.div>

                  {/* Label */}
                  <span
                    className="relative z-10 text-[9px] font-semibold mt-0.5 tracking-wide transition-all duration-200"
                    style={{
                      color: isActive ? 'var(--sweet-accent)' : 'var(--sweet-text-muted)',
                    }}
                  >
                    {item.label}
                  </span>

                  {/* Active dot indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="navDot"
                      className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                      style={{ background: 'var(--sweet-accent)' }}
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.45 }}
                    />
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
