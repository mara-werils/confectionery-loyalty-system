import { Routes, Route, Navigate } from 'react-router-dom';
import { useTonWallet } from '@tonconnect/ui-react';
import { useEffect } from 'react';

// Pages
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';

import History from './pages/History';
import Profile from './pages/Profile';
import Blockchain from './pages/Blockchain';
import Swap from './pages/Swap';

// New role-based pages
import BusinessRegister from './pages/business/BusinessRegister';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import CustomerRewards from './pages/customer/CustomerRewards';

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
      
      {/* Business registration (needs wallet but no layout) */}
      <Route element={<ProtectedRoute />}>
        <Route path="/business/register" element={<BusinessRegister />} />
      </Route>

      {/* Business routes with business layout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout variant="business" />}>
          <Route path="/business/dashboard" element={<Dashboard />} />
          <Route path="/dashboard" element={<Navigate to="/business/dashboard" replace />} />
          <Route path="/blockchain" element={<Blockchain />} />
          <Route path="/swap" element={<Swap />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>

      {/* Customer routes with customer layout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout variant="customer" />}>
          <Route path="/customer/dashboard" element={<CustomerDashboard />} />
          <Route path="/customer/rewards" element={<CustomerRewards />} />
          <Route path="/rewards" element={<Navigate to="/customer/rewards" replace />} />
          <Route path="/history" element={<History />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
