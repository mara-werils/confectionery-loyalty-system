import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChartBarSquareIcon,
  BuildingStorefrontIcon,
  GiftIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import {
  ChartBarSquareIcon as ChartBarSquareIconSolid,
  BuildingStorefrontIcon as BuildingStorefrontIconSolid,
  GiftIcon as GiftIconSolid,
  ClipboardDocumentListIcon as ClipboardDocumentListIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
} from '@heroicons/react/24/solid';
import clsx from 'clsx';

const navItems = [
  {
    path: '/admin',
    label: 'Обзор',
    icon: ChartBarSquareIcon,
    activeIcon: ChartBarSquareIconSolid,
    end: true,
  },
  {
    path: '/admin/partners',
    label: 'Партнёры',
    icon: BuildingStorefrontIcon,
    activeIcon: BuildingStorefrontIconSolid,
  },
  {
    path: '/admin/rewards',
    label: 'Награды',
    icon: GiftIcon,
    activeIcon: GiftIconSolid,
  },
  {
    path: '/admin/audit',
    label: 'Аудит',
    icon: ClipboardDocumentListIcon,
    activeIcon: ClipboardDocumentListIconSolid,
  },
  {
    path: '/admin/settings',
    label: 'Настройки',
    icon: Cog6ToothIcon,
    activeIcon: Cog6ToothIconSolid,
  },
];

export default function AdminLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex bg-[#0d0b0a]">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-stone-800 bg-stone-950/50">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-stone-800">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
            <ShieldCheckIcon className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">Sweet Loyalty</h1>
            <p className="text-[10px] text-stone-500 uppercase tracking-widest">Админ-панель</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = item.end
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);
            const Icon = isActive ? item.activeIcon : item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-200 group"
              >
                {isActive && (
                  <motion.div
                    layoutId="adminNavPill"
                    className="absolute inset-0 rounded-xl bg-stone-800/80 border border-stone-700/50"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <Icon
                  className={clsx(
                    'relative z-10 w-5 h-5 transition-colors',
                    isActive ? 'text-amber-400' : 'text-stone-500 group-hover:text-stone-300'
                  )}
                />
                <span
                  className={clsx(
                    'relative z-10 text-sm font-medium transition-colors',
                    isActive ? 'text-white' : 'text-stone-500 group-hover:text-stone-300'
                  )}
                >
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-800">
          <p className="text-[10px] text-stone-600 uppercase tracking-wider">Мастер-администратор</p>
          <p className="text-xs text-stone-400 mt-0.5 truncate">admin@sweetloyalty.kz</p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="h-16 border-b border-stone-800 bg-stone-950/50 flex items-center px-6 justify-between">
          <div className="md:hidden flex items-center gap-2">
            <ShieldCheckIcon className="w-5 h-5 text-amber-400" />
            <span className="text-sm font-bold text-white">Админ</span>
          </div>
          <div className="hidden md:block">
            <h2 className="text-sm font-medium text-stone-400">
              {navItems.find((n) =>
                n.end ? location.pathname === n.path : location.pathname.startsWith(n.path)
              )?.label || 'Панель управления'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
              <span className="text-xs font-bold text-amber-400">A</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="p-6"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 pb-safe">
        <div
          style={{
            background: 'linear-gradient(to top, #0d0b0a 60%, transparent)',
            paddingBottom: '12px',
            paddingTop: '20px',
            paddingLeft: '12px',
            paddingRight: '12px',
          }}
        >
          <div className="bg-stone-900/95 backdrop-blur-xl border border-stone-800 rounded-2xl px-1 py-1 flex items-center justify-around shadow-[0_-4px_24px_rgba(0,0,0,0.4)]">
            {navItems.map((item) => {
              const isActive = item.end
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);
              const Icon = isActive ? item.activeIcon : item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  className="relative flex flex-col items-center justify-center flex-1 py-2.5 rounded-xl transition-colors duration-200 group"
                >
                  {isActive && (
                    <motion.div
                      layoutId="adminMobileNavPill"
                      className="absolute inset-0 rounded-xl bg-stone-800"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                    />
                  )}
                  <Icon
                    className={clsx(
                      'relative z-10 w-5 h-5 transition-all duration-200',
                      isActive ? 'text-amber-400' : 'text-stone-600 group-hover:text-stone-400'
                    )}
                  />
                  <span
                    className={clsx(
                      'relative z-10 text-[9px] font-semibold mt-0.5 tracking-wide transition-all duration-200',
                      isActive ? 'text-white' : 'text-stone-600'
                    )}
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
