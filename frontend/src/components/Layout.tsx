import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HomeIcon,
  GiftIcon,
  ClockIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  GiftIcon as GiftIconSolid,
  ClockIcon as ClockIconSolid,
  UserCircleIcon as UserCircleIconSolid,
} from '@heroicons/react/24/solid';
import clsx from 'clsx';

const navItems = [
  {
    path: '/dashboard',
    label: 'Home',
    icon: HomeIcon,
    activeIcon: HomeIconSolid,
  },
  {
    path: '/rewards',
    label: 'Rewards',
    icon: GiftIcon,
    activeIcon: GiftIconSolid,
  },
  {
    path: '/history',
    label: 'History',
    icon: ClockIcon,
    activeIcon: ClockIconSolid,
  },
  {
    path: '/profile',
    label: 'Profile',
    icon: UserCircleIcon,
    activeIcon: UserCircleIconSolid,
  },
];

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary-50 via-white to-accent-50">
      {/* Main content area */}
      <main className="flex-1 pb-20 overflow-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-primary-100 safe-area-inset-bottom z-50">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = isActive ? item.activeIcon : item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={clsx(
                  'flex flex-col items-center justify-center py-2 px-4 rounded-xl transition-all duration-200',
                  isActive
                    ? 'text-primary-600'
                    : 'text-accent-400 hover:text-accent-600'
                )}
              >
                <motion.div
                  initial={false}
                  animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                >
                  <Icon className="w-6 h-6" />
                </motion.div>
                <span className="text-xs font-medium mt-1">{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 w-12 h-1 bg-primary-500 rounded-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}




