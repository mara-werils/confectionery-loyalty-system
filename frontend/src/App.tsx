import { Routes, Route, Navigate } from 'react-router-dom';
import { useTonWallet } from '@tonconnect/ui-react';
import { useEffect } from 'react';

// Pages
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Rewards from './pages/Rewards';
import History from './pages/History';
import Profile from './pages/Profile';

// Components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Hooks
import { useTelegram } from './hooks/useTelegram';
import { useAuthStore } from './store/authStore';

function App() {
  const { tg, isExpanded } = useTelegram();
  const wallet = useTonWallet();
  const { setWalletAddress } = useAuthStore();

  // Expand Telegram Mini App
  useEffect(() => {
    if (tg && !isExpanded) {
      tg.expand();
    }
  }, [tg, isExpanded]);

  // Sync wallet state
  useEffect(() => {
    if (wallet) {
      setWalletAddress(wallet.account.address);
    } else {
      setWalletAddress(null);
    }
  }, [wallet, setWalletAddress]);

  // Set Telegram theme
  useEffect(() => {
    if (tg?.themeParams) {
      const root = document.documentElement;
      Object.entries(tg.themeParams).forEach(([key, value]) => {
        root.style.setProperty(`--tg-theme-${key.replace(/_/g, '-')}`, value as string);
      });
    }
  }, [tg?.themeParams]);

  return (
    <Routes>
      {/* Public route */}
      <Route path="/" element={<Home />} />
      
      {/* Protected routes with layout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/rewards" element={<Rewards />} />
          <Route path="/history" element={<History />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;




