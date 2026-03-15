import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HomeIcon,
  GiftIcon,
  ClockIcon,
  UserCircleIcon,
  CubeTransparentIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  GiftIcon as GiftIconSolid,
  ClockIcon as ClockIconSolid,
  UserCircleIcon as UserCircleIconSolid,
  CubeTransparentIcon as CubeTransparentIconSolid,
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
    path: '/blockchain',
    label: 'Blockchain',
    icon: CubeTransparentIcon,
    activeIcon: CubeTransparentIconSolid,
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
    <div className="min-h-screen flex flex-col items-center bg-[#09090b]">
      {/* Main content area */}
      <main className="flex-1 w-full max-w-2xl pb-24 overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="h-full px-4 pt-6"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Floating pill navigation */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-zinc-900/80 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgb(0,0,0,0.2)] rounded-full px-2 py-2 flex items-center justify-center gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = isActive ? item.activeIcon : item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={clsx(
                  'relative flex flex-col items-center justify-center w-14 h-14 rounded-full transition-colors duration-300',
                  isActive
                    ? 'text-white'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNavBackground"
                    className="absolute inset-0 bg-white/10 rounded-full"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                
                <motion.div
                  initial={false}
                  animate={{ 
                    y: isActive ? -2 : 0,
                    scale: isActive ? 1.05 : 1
                  }}
                  transition={{ type: 'spring', bounce: 0.3, duration: 0.6 }}
                  className="relative z-10"
                >
                  <Icon className="w-6 h-6" />
                </motion.div>
                
                <span className={clsx(
                  "text-[10px] font-medium mt-1 relative z-10 transition-all duration-300",
                  isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 absolute bottom-0"
                )}>
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}












