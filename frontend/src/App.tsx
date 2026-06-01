import { Routes, Route, Navigate } from 'react-router-dom';
import { useTonWallet } from '@tonconnect/ui-react';
import { Component, type ErrorInfo, type ReactNode, useEffect } from 'react';

// Pages
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';

import History from './pages/History';
import Profile from './pages/Profile';
import Blockchain from './pages/Blockchain';
import Swap from './pages/Swap';
import Referrals from './pages/Referrals';
import Stats from './pages/Stats';

import AIPredictions from './pages/AIPredictions';
import Achievements from './pages/Achievements';
import Governance from './pages/Governance';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminAuthGate from './pages/admin/AdminAuthGate';
import AdminPartners from './pages/admin/AdminPartners';
import AdminRewards from './pages/admin/AdminRewards';
import AdminAuditLog from './pages/admin/AdminAuditLog';
import AdminSettings from './pages/admin/AdminSettings';

// New role-based pages
import BusinessRegister from './pages/business/BusinessRegister';
import CouponVerify from './pages/business/CouponVerify';
import Analytics from './pages/business/Analytics';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import CustomerRewards from './pages/customer/CustomerRewards';
import Staking from './pages/customer/Staking';

// Components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Hooks
import { useTelegram } from './hooks/useTelegram';
import { useAuthStore } from './store/authStore';

const RootRedirect = () => {
  const { role } = useAuthStore();
  return <Navigate to={role === 'business' ? '/business/dashboard' : '/customer/dashboard'} replace />;
};

const RoleGuard = ({ allowedRole, children }: { allowedRole: 'business' | 'customer', children: React.ReactNode }) => {
  const { role } = useAuthStore();
  if (role && role !== allowedRole) {
    return <RootRedirect />;
  }
  return <>{children}</>;
};

class RouteErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Route render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0d0b0a] text-white flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-2xl border border-stone-800 bg-stone-900 p-5 text-center">
            <p className="text-sm font-semibold text-stone-200 mb-2">Ошибка загрузки страницы</p>
            <p className="text-xs text-stone-500 mb-4">Попробуйте открыть раздел заново.</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2.5 rounded-xl bg-amber-500 text-black text-sm font-bold hover:bg-amber-400 transition-colors"
            >
              Перезагрузить
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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
      
      {/* Admin Routes with Auth Gate + Admin Layout */}
      <Route path="/admin" element={<AdminAuthGate />}>
        <Route index element={<AdminDashboard />} />
        <Route path="partners" element={<AdminPartners />} />
        <Route path="rewards" element={<AdminRewards />} />
        <Route path="audit" element={<AdminAuditLog />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>
      
      {/* Business registration (needs wallet but no layout) */}
      <Route element={<ProtectedRoute />}>
        <Route path="/business/register" element={<BusinessRegister />} />
      </Route>

      {/* Business routes with business layout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<RoleGuard allowedRole="business"><Layout variant="business" /></RoleGuard>}>
          <Route path="/business/dashboard" element={<RouteErrorBoundary><Dashboard /></RouteErrorBoundary>} />
          <Route path="/business/verify-coupon" element={<CouponVerify />} />
          <Route path="/ai" element={<AIPredictions />} />
          <Route path="/blockchain" element={<Blockchain />} />
          <Route path="/swap" element={<Swap />} />
          <Route path="/referrals" element={<Referrals />} />
          <Route path="/governance" element={<Governance />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/business/profile" element={<Profile />} />
        </Route>
      </Route>

      {/* Customer routes with customer layout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<RoleGuard allowedRole="customer"><Layout variant="customer" /></RoleGuard>}>
          <Route path="/customer/dashboard" element={<RouteErrorBoundary><CustomerDashboard /></RouteErrorBoundary>} />
          <Route path="/customer/rewards" element={<CustomerRewards />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/history" element={<History />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/staking" element={<Staking />} />
          <Route path="/customer/governance" element={<Governance />} />
          <Route path="/customer/profile" element={<Profile />} />
        </Route>
      </Route>

      {/* Generic fallback routes for ease of use */}
      <Route path="/dashboard" element={<RootRedirect />} />
      <Route path="/rewards" element={<RootRedirect />} />
      <Route path="/profile" element={<RootRedirect />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
